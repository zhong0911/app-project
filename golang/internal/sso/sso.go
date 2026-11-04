// Package sso 实现 OAuth2 授权码客户端（对标 nodejs oauth2.js / security.js 中的会话部分）。
// 只接入 AntX SSO，provider 固定为 sso。
package sso

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"antx/golang-template/internal/config"
)

// SessionCookie 浏览器持有的会话 Cookie 名称。
const SessionCookie = "app_session"

// SessionCookieMaxAge 会话 Cookie 有效期（7 天，单位秒）。
const SessionCookieMaxAge = 60 * 60 * 24 * 7

// stateTTL state 有效期（对标 nodejs STATE_TTL 600_000 ms）。
const stateTTL = 10 * time.Minute

// Provider SSO 客户端配置。
type Provider struct {
	Name             string
	ClientID         string
	ClientSecret     string
	AuthorizationURI string
	TokenURI         string
	UserinfoURI      string
	RevokeURI        string
	Scope            string
	LoginSuccessURL  string
}

// NewProvider 由环境变量构造 provider；client_id 为空时返回 ok=false（对标 buildProviders）。
func NewProvider(cfg config.Config) (Provider, bool) {
	if cfg.SSOClientID == "" {
		return Provider{}, false
	}
	issuer := strings.TrimRight(cfg.SSOIssuer, "/")

	authorizationURI := cfg.SSOAuthorizationURI
	if authorizationURI == "" {
		authorizationURI = issuer + "/oauth2/authorize"
	}
	tokenURI := cfg.SSOTokenURI
	if tokenURI == "" {
		tokenURI = issuer + "/oauth2/token"
	}
	userinfoURI := cfg.SSOUserinfoURI
	if userinfoURI == "" && issuer != "" {
		userinfoURI = issuer + "/userinfo"
	}
	revokeURI := cfg.SSORevokeURI
	if revokeURI == "" && issuer != "" {
		revokeURI = issuer + "/oauth2/revoke"
	}

	return Provider{
		Name:             "sso",
		ClientID:         cfg.SSOClientID,
		ClientSecret:     cfg.SSOClientSecret,
		AuthorizationURI: authorizationURI,
		TokenURI:         tokenURI,
		UserinfoURI:      userinfoURI,
		RevokeURI:        revokeURI,
		Scope:            cfg.SSOScope,
		LoginSuccessURL:  cfg.SSOLoginSuccessURL,
	}, true
}

// ---- state 存储（内存，带过期；生产建议换 Redis） ----

type stateEntry struct {
	provider  string
	createdAt time.Time
}

var (
	stateMu sync.Mutex
	states  = map[string]stateEntry{}
)

// NewState 生成随机 state 并记录 provider（对标 randomBytes(24).toString('hex')）。
func NewState(provider string) string {
	state := randomHex(24)
	stateMu.Lock()
	states[state] = stateEntry{provider: provider, createdAt: time.Now()}
	stateMu.Unlock()
	return state
}

// ConsumeState 校验并消费 state，防止 CSRF。
func ConsumeState(state, provider string) bool {
	stateMu.Lock()
	entry, ok := states[state]
	if ok {
		delete(states, state)
	}
	stateMu.Unlock()
	if !ok {
		return false
	}
	return entry.provider == provider && time.Since(entry.createdAt) <= stateTTL
}

// ---- 会话存储（内存；保存 SSO 换取的 access_token / refresh_token，退出时用于撤销） ----

// Session 服务端会话，浏览器只持有 HttpOnly 的 app_session cookie。
type Session struct {
	AccessToken  string
	RefreshToken string
	UID          string
}

var (
	sessionMu sync.RWMutex
	sessions  = map[string]Session{}
)

// CreateSession 新建会话并返回会话 id。
func CreateSession(s Session) string {
	sid := randomHex(24)
	sessionMu.Lock()
	sessions[sid] = s
	sessionMu.Unlock()
	return sid
}

// GetSession 读取会话。
func GetSession(sid string) (Session, bool) {
	if sid == "" {
		return Session{}, false
	}
	sessionMu.RLock()
	s, ok := sessions[sid]
	sessionMu.RUnlock()
	return s, ok
}

// DestroySession 销毁会话。
func DestroySession(sid string) {
	if sid == "" {
		return
	}
	sessionMu.Lock()
	delete(sessions, sid)
	sessionMu.Unlock()
}

// ParseSessionID 从请求 Cookie 中解析会话 id（手写极简解析，对标 nodejs）。
func ParseSessionID(r *http.Request) string {
	raw := r.Header.Get("Cookie")
	for _, part := range strings.Split(raw, ";") {
		part = strings.TrimSpace(part)
		if strings.HasPrefix(part, SessionCookie+"=") {
			value := strings.TrimPrefix(part, SessionCookie+"=")
			if value != "" {
				return value
			}
		}
	}
	return ""
}

// SessionCookieHeader 生成 Set-Cookie 值；sid 为空串表示清除。
func SessionCookieHeader(sid string, secure bool) string {
	if sid == "" {
		header := fmt.Sprintf("%s=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0", SessionCookie)
		if secure {
			header += "; Secure"
		}
		return header
	}
	header := fmt.Sprintf("%s=%s; HttpOnly; Path=/; SameSite=Lax; Max-Age=%d", SessionCookie, sid, SessionCookieMaxAge)
	if secure {
		header += "; Secure"
	}
	return header
}

// BuildAuthorizeURL 构造授权服务器跳转 URL 与 state。
func BuildAuthorizeURL(p Provider, baseURL string) (string, string) {
	state := NewState(p.Name)
	params := url.Values{}
	params.Set("response_type", "code")
	params.Set("client_id", p.ClientID)
	params.Set("redirect_uri", RedirectURI(baseURL))
	params.Set("scope", p.Scope)
	params.Set("state", state)
	return p.AuthorizationURI + "?" + params.Encode(), state
}

// RedirectURI 回调地址，全后端统一为 <base>/sso/callback。
func RedirectURI(baseURL string) string {
	return baseURL + "/sso/callback"
}

// BaseURL 由请求推导服务基地址（对标 nodejs req.protocol + host）。
func BaseURL(r *http.Request) string {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	return scheme + "://" + r.Host
}

var httpClient = &http.Client{Timeout: 30 * time.Second}

// ExchangeCode 用授权码换取 token（POST token 端点）。
func ExchangeCode(ctx context.Context, p Provider, code, baseURL string) (map[string]any, error) {
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("redirect_uri", RedirectURI(baseURL))
	form.Set("client_id", p.ClientID)
	form.Set("client_secret", p.ClientSecret)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.TokenURI, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("token 换取失败: HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var token map[string]any
	dec := json.NewDecoder(bytes.NewReader(body))
	dec.UseNumber()
	if err := dec.Decode(&token); err != nil {
		return nil, err
	}
	return token, nil
}

// RevokeTokens 调用 SSO revoke 端点（RFC 7009）撤销会话中的 token：优先 refresh_token。
// 撤销失败仅记日志，不阻塞退出流程（对标 nodejs revokeTokens）。
func RevokeTokens(ctx context.Context, p Provider, s Session) {
	if p.RevokeURI == "" {
		return
	}
	token := s.RefreshToken
	hint := "refresh_token"
	if token == "" {
		token = s.AccessToken
		hint = "access_token"
	}
	if token == "" {
		return
	}

	form := url.Values{}
	form.Set("token", token)
	form.Set("token_type_hint", hint)
	form.Set("client_id", p.ClientID)
	form.Set("client_secret", p.ClientSecret)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.RevokeURI, strings.NewReader(form.Encode()))
	if err != nil {
		log.Printf("[SSO] revoke 失败（忽略，不阻塞退出）: %v", err)
		return
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := httpClient.Do(req)
	if err != nil {
		log.Printf("[SSO] revoke 失败（忽略，不阻塞退出）: %v", err)
		return
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)
	log.Printf("[SSO] revoke 完成: status=%d", resp.StatusCode)
}

// DecodeSub 从 JWT access_token 解析 sub（不验签，token 由本应用从 SSO token 端点获取）。
// 解析失败或 sub 缺失时返回空串。
func DecodeSub(token string) string {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return ""
	}
	payload := strings.TrimRight(parts[1], "=")
	decoded, err := base64.RawURLEncoding.DecodeString(payload)
	if err != nil {
		return ""
	}
	dec := json.NewDecoder(bytes.NewReader(decoded))
	dec.UseNumber()
	var claims map[string]any
	if err := dec.Decode(&claims); err != nil {
		return ""
	}
	sub, ok := claims["sub"]
	if !ok || sub == nil {
		return ""
	}
	switch v := sub.(type) {
	case string:
		return v
	case json.Number:
		return v.String()
	case bool:
		return fmt.Sprintf("%t", v)
	default:
		return fmt.Sprintf("%v", v)
	}
}

// BearerToken 从 Authorization 头提取 Bearer token。
func BearerToken(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if len(auth) >= 7 && strings.EqualFold(auth[:7], "bearer ") {
		return strings.TrimSpace(auth[7:])
	}
	return ""
}

func randomHex(nBytes int) string {
	buf := make([]byte, nBytes)
	if _, err := rand.Read(buf); err != nil {
		// crypto/rand 失败属于不可恢复的系统错误，与原模板 Node 抛异常行为一致。
		panic(err)
	}
	return hex.EncodeToString(buf)
}
