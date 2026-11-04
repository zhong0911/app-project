package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"antx/golang-template/internal/result"
	"antx/golang-template/internal/sso"
)

// authorize GET /sso/authorize 跳转到授权服务器。
func (h *Handler) authorize(w http.ResponseWriter, r *http.Request) error {
	provider, ok := sso.NewProvider(h.cfg)
	if !ok {
		return result.NewBusiness(result.NotFound, "")
	}
	authorizeURL, _ := sso.BuildAuthorizeURL(provider, sso.BaseURL(r))
	log.Printf("[OAuth] 跳转授权服务器: provider=%s", provider.Name)

	w.Header().Set("Location", authorizeURL)
	w.WriteHeader(http.StatusFound)
	return nil
}

// callback GET /sso/callback 接收授权码，换取 token，重定向登录成功页。
func (h *Handler) callback(w http.ResponseWriter, r *http.Request) error {
	provider, ok := sso.NewProvider(h.cfg)
	if !ok {
		return result.NewBusiness(result.NotFound, "")
	}

	query := r.URL.Query()
	stateValues := query["state"]
	state := ""
	if len(stateValues) == 1 {
		state = stateValues[0]
	}
	if !sso.ConsumeState(state, provider.Name) {
		return result.BadRequestError("state 校验失败")
	}

	codeValues := query["code"]
	var code string
	if len(codeValues) == 1 {
		code = codeValues[0]
	}
	if code == "" {
		return result.BadRequestError("缺少授权码 code")
	}

	token, err := sso.ExchangeCode(r.Context(), provider, code, sso.BaseURL(r))
	if err != nil {
		log.Printf("[OAuth] token 换取失败: %v", err)
		return result.BadRequestError("token 换取失败")
	}

	// token 存服务端会话（access_token/refresh_token 不进浏览器），cookie 仅存会话 id
	sid := sso.CreateSession(sso.Session{
		AccessToken:  tokenString(token["access_token"]),
		RefreshToken: tokenString(token["refresh_token"]),
		UID:          tokenString(token["uid"]),
	})
	w.Header().Set("Set-Cookie", sso.SessionCookieHeader(sid, h.cfg.SessionCookieSecure))
	log.Printf("[OAuth] 授权码换 token 成功: provider=%s", provider.Name)

	w.Header().Set("Location", provider.LoginSuccessURL)
	w.WriteHeader(http.StatusFound)
	return nil
}

type logoutVO struct {
	SSOLogoutURL *string `json:"ssoLogoutUrl"`
}

// logout POST /api/auth/logout 撤销 refresh_token + 销毁服务端会话 + 清除 cookie。
func (h *Handler) logout(w http.ResponseWriter, r *http.Request) error {
	sid := sso.ParseSessionID(r)
	session, ok := sso.GetSession(sid)
	if ok {
		if provider, found := sso.NewProvider(h.cfg); found {
			sso.RevokeTokens(r.Context(), provider, session)
		}
	}
	sso.DestroySession(sid)
	w.Header().Set("Set-Cookie", sso.SessionCookieHeader("", h.cfg.SessionCookieSecure))

	vo := logoutVO{}
	if h.cfg.SSOLogoutURI != "" {
		url := h.cfg.SSOLogoutURI
		vo.SSOLogoutURL = &url
	}
	writeJSON(w, http.StatusOK, result.SuccessWith(vo))
	return nil
}

func tokenString(value any) string {
	switch v := value.(type) {
	case string:
		return v
	case json.Number:
		return v.String()
	default:
		return ""
	}
}
