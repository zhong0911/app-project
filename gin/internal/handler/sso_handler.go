package handler

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/antx/gin-template/internal/errno"
	"github.com/antx/gin-template/internal/service"
	"github.com/antx/gin-template/internal/session"
	"github.com/antx/gin-template/pkg/config"
	"github.com/antx/gin-template/pkg/sso"
)

// SsoHandler SSO 登录入口（/sso/authorize、/sso/callback）。
type SsoHandler struct {
	cfg    *config.Config
	client *sso.Client
	store  *session.Store
	users  *service.UserService
}

// NewSsoHandler 创建 SSO 处理器。
func NewSsoHandler(cfg *config.Config, client *sso.Client, store *session.Store, users *service.UserService) *SsoHandler {
	return &SsoHandler{cfg: cfg, client: client, store: store, users: users}
}

// Authorize 302 跳 SSO 登录页。
// 可带 ?redirect_uri=<前端回跳地址>（站内路径或白名单内的绝对地址）：校验后存会话，回调成功后直接跳过去。
func (h *SsoHandler) Authorize(c *gin.Context) {
	state, err := sso.NewState()
	if err != nil {
		writeError(c, errno.New(errno.CodeInternalError, "生成 state 失败"))
		return
	}

	// 回跳地址与 state 同会话保存，回调成功时消费一次
	target := sanitizeRedirectURI(c.Query("redirect_uri"), h.cfg.CORS.AllowedOrigins)

	id, _ := h.ensureSession(c)
	h.store.Update(id, func(s *session.Session) {
		s.State = state
		s.RedirectURI = target
	})

	c.Redirect(http.StatusFound, h.client.BuildAuthorizeURL(state))
}

// Callback SSO 授权回调：校验 state → 换 token → 取用户信息 → 写会话 → 跳成功页。
func (h *SsoHandler) Callback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")

	id, sess := h.ensureSession(c)
	if sess.State == "" || state == "" || sess.State != state {
		writeError(c, errno.BadRequest("state 校验失败，请重新登录"))
		return
	}

	token, err := h.client.ExchangeCode(c.Request.Context(), code)
	if err != nil {
		writeError(c, errno.New(errno.CodeUnauthorized, err.Error()))
		return
	}
	accessToken, _ := token["access_token"].(string)
	if accessToken == "" {
		writeError(c, errno.New(errno.CodeUnauthorized, "SSO 未返回 access_token"))
		return
	}

	userInfo, err := h.client.FetchUserInfo(c.Request.Context(), accessToken)
	if err != nil {
		writeError(c, errno.New(errno.CodeUnauthorized, err.Error()))
		return
	}

	sub := ""
	if value, ok := userInfo["sub"]; ok && value != nil {
		sub = fmt.Sprint(value)
	}
	if sub == "" {
		writeError(c, errno.New(errno.CodeUnauthorized, "SSO 未返回用户标识 sub"))
		return
	}

	name, _ := userInfo["preferred_username"].(string)
	if name == "" {
		name, _ = userInfo["name"].(string)
	}
	if name == "" {
		name = sub
	}

	refreshToken, _ := token["refresh_token"].(string)
	// 回跳地址在清空会话前取出（回调成功只消费一次）
	redirectURI := sess.RedirectURI

	// 身份 + token 全部留在服务端会话，前端只拿 Cookie
	h.store.Update(id, func(s *session.Session) {
		s.UID = sub
		s.Name = name
		s.AccessToken = accessToken
		s.RefreshToken = refreshToken
		s.State = ""
		s.RedirectURI = ""
	})

	// 新用户默认注册为 USER
	h.users.GetOrCreateDefaultUser(sub)

	// 优先跳前端透传的回跳地址，否则用配置的兜底地址
	landing := redirectURI
	if landing == "" {
		landing = h.cfg.SSO.LoginSuccessURL
	}
	c.Redirect(http.StatusFound, landing)
}

// ensureSession 读取或创建服务端会话，返回会话 ID 与会话对象。
func (h *SsoHandler) ensureSession(c *gin.Context) (string, *session.Session) {
	if id, err := c.Cookie(h.cfg.Session.CookieName); err == nil && id != "" {
		if sess, ok := h.store.Get(id); ok {
			return id, sess
		}
	}

	id, sess := h.store.Create()
	maxAge := h.cfg.Session.MaxAge
	c.SetCookie(h.cfg.Session.CookieName, id, maxAge, "/", "", false, true)
	return id, sess
}
