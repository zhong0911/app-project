"""OAuth2 客户端路由（全后端统一规范路径）。

  - GET /oauth2/{provider}/authorize   跳转到授权服务器
  - GET /oauth2/{provider}/callback    接收授权码 code，换取 token，重定向回登录成功页
"""
from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import RedirectResponse

from ..oauth2 import build_authorize_url, build_providers, consume_state
from ..result import Result
from ..result_code import ResultCode

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/oauth2", tags=["OAuth"])


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
    # 登录成功：重定向回登录成功页（对标 Spring Security defaultSuccessUrl）
    return RedirectResponse(cfg.login_success_url)
