// Package middleware 认证中间件（对标 Spring Boot 的 Security 过滤器链 + AOP）。
package middleware

import (
	"context"
	"encoding/base64"
	"errors"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/antx/gin-template/internal/errno"
	"github.com/antx/gin-template/internal/service"
	"github.com/antx/gin-template/internal/session"
	"github.com/antx/gin-template/pkg/config"
	"github.com/antx/gin-template/pkg/response"
	"github.com/antx/gin-template/pkg/sso"
)

// 上下文键
const (
	CtxSessionID = "sessionId"
	CtxSession   = "session"
	CtxPrincipal = "principal"
)

// Principal 当前登录身份。
type Principal struct {
	UID      string
	Name     string
	AuthType string // sso-login / sso-jwt / basic
	Claims   map[string]any
}

// SessionMiddleware 绑定服务端会话（Cookie 只放会话 ID）。
func SessionMiddleware(store *session.Store, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := c.Cookie(cfg.Session.CookieName)
		if err != nil || id == "" {
			c.Next()
			return
		}
		sess, ok := store.Get(id)
		if ok {
			c.Set(CtxSessionID, id)
			c.Set(CtxSession, sess)
		}
		c.Next()
	}
}

// IdentityMiddleware 解析身份挂到上下文（不拦截，未登录为匿名）。
func IdentityMiddleware(cfg *config.Config, ssoClient *sso.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		principal := resolve(c, cfg, ssoClient)
		c.Set(CtxPrincipal, principal)
		c.Next()
	}
}

func resolve(c *gin.Context, cfg *config.Config, ssoClient *sso.Client) *Principal {
	// 1) SSO 浏览器登录：会话里存了 uid
	if value, ok := c.Get(CtxSession); ok {
		if sess, ok := value.(*session.Session); ok && sess.UID != "" {
			return &Principal{UID: sess.UID, Name: sess.Name, AuthType: "sso-login"}
		}
	}

	authorization := c.GetHeader("Authorization")
	lower := strings.ToLower(authorization)

	// 2) Bearer Token
	if strings.HasPrefix(lower, "bearer ") {
		raw := strings.TrimSpace(authorization[7:])
		ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
		defer cancel()

		claims, err := ssoClient.VerifyToken(ctx, raw)
		if err != nil {
			return &Principal{AuthType: "invalid"}
		}
		uid, _ := claims["sub"].(string)
		name, _ := claims["preferred_username"].(string)
		if name == "" {
			name, _ = claims["name"].(string)
		}
		if name == "" {
			name = uid
		}
		return &Principal{UID: uid, Name: name, AuthType: "sso-jwt", Claims: claims}
	}

	// 3) 本地联调 Basic
	if strings.HasPrefix(lower, "basic ") && cfg.Security.BasicEnabled {
		decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(authorization[6:]))
		if err != nil {
			return &Principal{AuthType: "invalid"}
		}
		parts := strings.SplitN(string(decoded), ":", 2)
		if len(parts) != 2 ||
			parts[0] != cfg.Security.AdminUsername ||
			parts[1] != cfg.Security.AdminPassword {
			return &Principal{AuthType: "invalid"}
		}
		return &Principal{UID: parts[0], Name: parts[0], AuthType: "basic"}
	}

	return &Principal{AuthType: "anonymous"}
}

// RequireLogin 要求已登录，否则 401。
func RequireLogin() gin.HandlerFunc {
	return func(c *gin.Context) {
		if currentUID(c) == "" {
			c.AbortWithStatusJSON(200, response.Error(errno.CodeUnauthorized, errno.Message[errno.CodeUnauthorized]))
			return
		}
		c.Next()
	}
}

// CurrentPrincipal 取当前身份（未登录返回匿名）。
func CurrentPrincipal(c *gin.Context) *Principal {
	value, _ := c.Get(CtxPrincipal)
	if p, ok := value.(*Principal); ok && p != nil {
		return p
	}
	return &Principal{AuthType: "anonymous"}
}

// currentUID 当前 uid（无效身份视为未登录）。
func currentUID(c *gin.Context) string {
	p := CurrentPrincipal(c)
	if p.AuthType == "invalid" {
		return ""
	}
	return p.UID
}

// RequireAdmin 要求管理员身份（未登录 401，非管理员 / 已禁用 403）。
func RequireAdmin(users *service.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		principal := CurrentPrincipal(c)
		if _, err := users.RequireAdmin(principal.UID); err != nil {
			var bizErr *errno.BusinessError
			if errors.As(err, &bizErr) {
				c.AbortWithStatusJSON(200, response.Error(bizErr.Code, bizErr.Message))
				return
			}
			c.AbortWithStatusJSON(200, response.Error(errno.CodeInternalError, errno.Message[errno.CodeInternalError]))
			return
		}
		c.Next()
	}
}
