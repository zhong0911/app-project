package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/antx/gin-template/internal/middleware"
	"github.com/antx/gin-template/internal/session"
	"github.com/antx/gin-template/pkg/config"
	"github.com/antx/gin-template/pkg/response"
	"github.com/antx/gin-template/pkg/sso"
)

// AuthHandler 认证接口（/api/auth）。
type AuthHandler struct {
	cfg    *config.Config
	client *sso.Client
	store  *session.Store
}

// NewAuthHandler 创建认证处理器。
func NewAuthHandler(cfg *config.Config, client *sso.Client, store *session.Store) *AuthHandler {
	return &AuthHandler{cfg: cfg, client: client, store: store}
}

// Me 当前登录用户。
func (h *AuthHandler) Me(c *gin.Context) {
	principal := middleware.CurrentPrincipal(c)
	if principal.UID == "" {
		c.JSON(http.StatusOK, response.Success(map[string]any{}))
		return
	}

	data := map[string]any{"authenticated": true}
	switch principal.AuthType {
	case "sso-jwt":
		data["type"] = "sso-jwt"
		data["subject"] = principal.UID
		data["claims"] = principal.Claims
	case "sso-login":
		data["type"] = "sso-login"
		data["clientRegistrationId"] = "sso"
		data["name"] = principal.Name
		data["attributes"] = map[string]any{"sub": principal.UID, "preferred_username": principal.Name}
	default:
		data["type"] = "basic"
		data["name"] = principal.Name
	}
	c.JSON(http.StatusOK, response.Success(data))
}

// Logout 撤销 SSO token + 销毁会话。
func (h *AuthHandler) Logout(c *gin.Context) {
	var refreshToken, accessToken string
	if value, ok := c.Get(middleware.CtxSession); ok {
		if sess, ok := value.(*session.Session); ok {
			refreshToken = sess.RefreshToken
			accessToken = sess.AccessToken
		}
	}

	// 1) 优先撤销 refresh_token，没有则撤销 access_token（失败不阻塞退出）
	if refreshToken != "" {
		h.client.RevokeToken(c.Request.Context(), refreshToken, "refresh_token")
	} else if accessToken != "" {
		h.client.RevokeToken(c.Request.Context(), accessToken, "access_token")
	}

	// 2) 销毁本地会话
	if id, ok := c.Get(middleware.CtxSessionID); ok {
		if sid, ok := id.(string); ok && sid != "" {
			h.store.Destroy(sid)
		}
	}
	c.SetCookie(h.cfg.Session.CookieName, "", -1, "/", "", false, true)

	// 3) 返回 SSO 登出地址（前端整页跳转完成全局退出）
	var logoutURL any
	if h.cfg.SSO.LogoutURI != "" {
		logoutURL = h.cfg.SSO.LogoutURI
	}
	c.JSON(http.StatusOK, response.Success(map[string]any{
		"ssoLogoutUrl": logoutURL,
	}))
}
