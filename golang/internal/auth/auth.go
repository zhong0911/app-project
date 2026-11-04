// Package auth 解析当前 SSO 用户身份并做管理员判定（对标 nodejs security.js）。
package auth

import (
	"context"
	"net/http"

	"antx/golang-template/internal/config"
	"antx/golang-template/internal/repo"
	"antx/golang-template/internal/result"
	"antx/golang-template/internal/sso"
)

// CurrentUID 解析当前登录用户的 SSO uid；未登录返回空串。
// 会话中的 uid 优先；否则从 access_token 的 sub 解析。
func CurrentUID(r *http.Request, cfg config.Config) string {
	session, ok := sso.GetSession(sso.ParseSessionID(r))
	if ok {
		if session.UID != "" {
			return session.UID
		}
		token := sso.BearerToken(r)
		if token == "" {
			token = session.AccessToken
		}
		return sso.DecodeSub(token)
	}
	return sso.DecodeSub(sso.BearerToken(r))
}

// AdminUID 管理员 SSO uid（默认 1）。
func AdminUID(cfg config.Config) string {
	if cfg.SSOAdminUID == "" {
		return "1"
	}
	return cfg.SSOAdminUID
}

// IsAdmin 判断是否为管理员。
func IsAdmin(uid string, cfg config.Config) bool {
	return uid != "" && uid == AdminUID(cfg)
}

// RequireAdmin 管理接口鉴权：未登录 401，非管理员 403，被禁用的管理员 403。
func RequireAdmin(ctx context.Context, r *http.Request, cfg config.Config, users *repo.UserRepo) (string, error) {
	uid := CurrentUID(r, cfg)
	if uid == "" {
		return "", result.NewBusiness(result.Unauthorized, "")
	}
	if !IsAdmin(uid, cfg) {
		return "", result.NewBusiness(result.Forbidden, "仅管理员可访问")
	}
	local, err := users.GetByUID(ctx, uid, false)
	if err != nil {
		return "", err
	}
	if local != nil && local.Status == 0 {
		return "", result.NewBusiness(result.Forbidden, "账号已被禁用")
	}
	return uid, nil
}
