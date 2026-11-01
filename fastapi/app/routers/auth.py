"""OAuth2 客户端路由（全后端统一规范路径）。

  - GET  /oauth2/{provider}/authorize   跳转到授权服务器
  - GET  /oauth2/{provider}/callback    接收授权码 code，换取 token，重定向回登录成功页
  - POST /api/auth/logout               单点退出（撤销 refresh_token + 销毁会话，返回 SSO 退出地址）
"""
from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse

from ..oauth2 import (
    SESSION_COOKIE,
    _env,
    build_authorize_url,
    build_providers,
    consume_state,
    create_session,
    destroy_session,
    get_session,
)
from ..result import Result
from ..result_code import ResultCode

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/oauth2", tags=["OAuth"])

# 认证 API 路由（/api/auth/*，对标 Spring Boot AuthController）
auth_api_router = APIRouter(prefix="/api/auth", tags=["Auth"])


async def _revoke_tokens(tokens: dict) -> None:
    """调用 SSO 的 revoke 端点（RFC 7009）撤销会话中的 token：优先 refresh_token。

    撤销失败仅记日志，不阻塞退出流程。
    """
    cfg = build_providers().get("sso")
    if not cfg or not cfg.revoke_uri:
        return
    refresh = tokens.get("refresh_token")
    token = refresh or tokens.get("access_token")
    if not token:
        return
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                cfg.revoke_uri,
                data={
                    "token": token,
                    "token_type_hint": "refresh_token" if refresh else "access_token",
                    "client_id": cfg.client_id,
                    "client_secret": cfg.client_secret,
                },
                timeout=10,
            )
            logger.info("[SSO] revoke 完成: status=%s", resp.status_code)
    except Exception:  # noqa: BLE001
        logger.warning("[SSO] revoke 失败（忽略，不阻塞退出）", exc_info=True)


@auth_api_router.post("/logout")
async def logout(request: Request, response: Response) -> dict:
    """单点退出：撤销 SSO 侧 refresh_token → 销毁服务端会话 → 清除 app_session cookie。

    返回 ssoLogoutUrl（env SSO_LOGOUT_URI，授权服务器登出端点），
    前端整页跳转该地址可完成 SSO 全局退出；未配置则仅退出本应用。
    """
    sid = request.cookies.get(SESSION_COOKIE)
    tokens = get_session(sid)
    if tokens:
        await _revoke_tokens(tokens)
    destroy_session(sid)
    response.delete_cookie(SESSION_COOKIE, path="/")
    logout_uri = _env("SSO_LOGOUT_URI")
    return Result.success_with({"ssoLogoutUrl": logout_uri or None})


def _base_url(request: Request) -> str:
    """从请求推导 baseUrl（对标 Spring Security {baseUrl}）。"""
    return str(request.base_url).rstrip("/")


@router.get("/{provider}/authorize")
async def authorize(provider: str, request: Request) -> RedirectResponse:
    """跳转到授权服务器（对标 Spring Security 授权入口）。"""
    if provider not in build_providers():
        raise HTTPException(status_code=404, detail="请求资源不存在")
    url, _state = build_authorize_url(provider, _base_url(request))
    logger.info("[OAuth] 跳转授权服务器: provider=%s", provider)
    return RedirectResponse(url)


@router.get("/{provider}/callback")
async def callback(
    provider: str,
    request: Request,
    code: str = Query(...),
    state: str = Query(...),
) -> RedirectResponse:
    """接受授权码，换取 token（对标 Spring Security 回调处理）。"""
    if provider not in build_providers():
        raise HTTPException(status_code=404, detail="请求资源不存在")
    if not consume_state(state, provider):
        # state 校验失败（CSRF / 过期），按统一格式返回错误
        raise HTTPException(status_code=400, detail="state 校验失败")

    cfg = build_providers()[provider]
    redirect_uri = f"{_base_url(request)}/oauth2/{provider}/callback"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                cfg.token_uri,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": cfg.client_id,
                    "client_secret": cfg.client_secret,
                },
                timeout=15,
            )
            resp.raise_for_status()
            token = resp.json()
    except Exception as e:  # noqa: BLE001
        logger.exception("[OAuth] token 换取失败")
        raise HTTPException(status_code=400, detail=f"token 换取失败: {e}") from e

    logger.info("[OAuth] 授权码换 token 成功: provider=%s", provider)
    # token 存服务端会话（access_token/refresh_token 不进浏览器），cookie 仅存会话 id
    redirect = RedirectResponse(cfg.login_success_url)
    redirect.set_cookie(
        SESSION_COOKIE, create_session(token),
        httponly=True, samesite="lax", path="/", max_age=86400 * 7,
    )
    # 登录成功：重定向回登录成功页（对标 Spring Security defaultSuccessUrl）
    return redirect
