"""SSO 登录入口（对标 Spring Boot 的 controller/OAuth2LoginController）。

路径全后端统一，不要在子应用里改：
- `GET /sso/authorize`  → 302 跳 SSO 登录页（带 state）
- `GET /sso/callback`   → 校验 state、换 token、写会话、跳登录成功页
"""

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.common.result_code import ResultCode
from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import BusinessException
from app.core.sso import (
    build_authorize_url,
    exchange_code,
    fetch_userinfo,
    new_state,
    sanitize_redirect_uri,
)
from app.service.user_service import UserService

router = APIRouter(prefix="/sso", tags=["SSO"])


@router.get("/authorize", summary="跳转 SSO 登录页")
async def authorize(
    request: Request,
    redirect_uri: str | None = Query(default=None, description="登录成功后回跳的前端页面地址"),
) -> RedirectResponse:
    state = new_state()
    # state 存服务端会话，回调时校验，防 CSRF
    request.session["sso_state"] = state
    # 回跳地址与 state 同会话保存，回调成功时消费一次
    target = sanitize_redirect_uri(redirect_uri)
    if target:
        request.session["sso_redirect_uri"] = target
    else:
        request.session.pop("sso_redirect_uri", None)
    return RedirectResponse(build_authorize_url(state), status_code=302)


@router.get("/callback", summary="SSO 授权回调")
async def callback(
    request: Request,
    db: Session = Depends(get_db),
    code: str = Query(..., description="授权码"),
    state: str = Query(..., description="防 CSRF 的 state"),
) -> RedirectResponse:
    expected = request.session.pop("sso_state", None)
    if not expected or state != expected:
        raise BusinessException(ResultCode.BAD_REQUEST, "state 校验失败，请重新登录")

    token = await exchange_code(code)
    access_token = token.get("access_token")
    if not access_token:
        raise BusinessException(ResultCode.UNAUTHORIZED, "SSO 未返回 access_token")

    userinfo = await fetch_userinfo(access_token)
    sub = userinfo.get("sub")
    if sub is None:
        raise BusinessException(ResultCode.UNAUTHORIZED, "SSO 未返回用户标识 sub")

    # 身份 + token 全部留在服务端会话；前端只拿到会话 Cookie
    request.session.update(
        {
            "uid": str(sub),
            "name": userinfo.get("preferred_username") or userinfo.get("name") or str(sub),
            "access_token": access_token,
            "refresh_token": token.get("refresh_token"),
        }
    )
    # 新用户默认注册为普通用户（USER），管理员由 SSO_ADMIN_UID / 管理接口赋权
    UserService(db).get_or_create_default_user(str(sub))

    # 优先跳前端透传的回跳地址（相对路径保持相对，浏览器按前端源解析），否则用配置的兜底地址
    target = request.session.pop("sso_redirect_uri", None) or settings.sso_login_success_url
    return RedirectResponse(target, status_code=302)
