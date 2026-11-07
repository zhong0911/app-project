"""认证接口（对标 Spring Boot 的 controller/AuthController）：/api/auth/me、/api/auth/logout。"""

from fastapi import APIRouter, Depends, Request

from app.core.config import settings
from app.core.security import Principal, get_principal
from app.core.sso import revoke_token
from app.schemas.common import ok

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.get("/me", summary="当前登录用户")
async def me(principal: Principal = Depends(get_principal)) -> dict:
    data: dict = {}
    if not principal.uid:
        return ok(data)

    data["authenticated"] = True
    if principal.auth_type == "sso-jwt":
        data["type"] = "sso-jwt"
        data["subject"] = principal.uid
        data["claims"] = principal.claims
    elif principal.auth_type == "sso-login":
        data["type"] = "sso-login"
        data["clientRegistrationId"] = "sso"
        data["name"] = principal.name
        data["attributes"] = {"sub": principal.uid, "preferred_username": principal.name}
    else:
        data["type"] = "basic"
        data["name"] = principal.name
    return ok(data)


@router.post("/logout", summary="退出登录（撤销 SSO token + 销毁会话）")
async def logout(request: Request) -> dict:
    # 1) 优先撤销 refresh_token，没有则撤销 access_token
    refresh_token = request.session.get("refresh_token")
    access_token = request.session.get("access_token")
    if refresh_token:
        await revoke_token(refresh_token, "refresh_token")
    elif access_token:
        await revoke_token(access_token, "access_token")

    # 2) 销毁本地会话
    request.session.clear()

    # 3) 返回 SSO 登出地址（前端整页跳转可完成全局退出；未配置则为 null）
    return ok({"ssoLogoutUrl": settings.sso_logout_uri or None})
