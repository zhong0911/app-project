// Package sso SSO 客户端（对标 Spring Boot 的 OAuth2 Client：授权码登录 + JWT 验签 + revoke）。
package sso

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"

	"github.com/antx/gin-template/pkg/config"
)

// Client SSO 客户端。
type Client struct {
	cfg        *config.SSOConfig
	httpClient *http.Client

	once   sync.Once
	keySet jwk.Set
	keyErr error
}

// NewClient 创建 SSO 客户端。
func NewClient(cfg *config.SSOConfig) *Client {
	return &Client{
		cfg:        cfg,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// NewState 生成 state（防 CSRF，存会话后回调校验）。
func NewState() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

// BuildAuthorizeURL 拼装授权跳转地址。
func (c *Client) BuildAuthorizeURL(state string) string {
	values := url.Values{}
	values.Set("response_type", "code")
	values.Set("client_id", c.cfg.ClientID)
	values.Set("redirect_uri", c.cfg.RedirectURI)
	values.Set("scope", c.cfg.Scope)
	values.Set("state", state)

	sep := "?"
	if strings.Contains(c.cfg.AuthorizationURI, "?") {
		sep = "&"
	}
	return c.cfg.AuthorizationURI + sep + values.Encode()
}

// ExchangeCode 用授权码换 token（client_secret_post）。
func (c *Client) ExchangeCode(ctx context.Context, code string) (map[string]any, error) {
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("redirect_uri", c.cfg.RedirectURI)
	form.Set("client_id", c.cfg.ClientID)
	form.Set("client_secret", c.cfg.ClientSecret)

	return c.postForm(ctx, c.cfg.TokenURI, form)
}

// FetchUserInfo 获取用户资料（sub 即用户 uid）。
func (c *Client) FetchUserInfo(ctx context.Context, accessToken string) (map[string]any, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.cfg.UserinfoURI, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("SSO 不可达: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("获取 SSO 用户信息失败: HTTP %d", resp.StatusCode)
	}
	return decodeJSON(resp.Body)
}

// RevokeToken 撤销 token（RFC 7009）；失败只返回 false，不阻塞退出。
func (c *Client) RevokeToken(ctx context.Context, token, hint string) bool {
	if token == "" || c.cfg.RevokeURI == "" {
		return false
	}
	form := url.Values{}
	form.Set("token", token)
	form.Set("token_type_hint", hint)
	form.Set("client_id", c.cfg.ClientID)
	form.Set("client_secret", c.cfg.ClientSecret)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.cfg.RevokeURI, strings.NewReader(form.Encode()))
	if err != nil {
		return false
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode < 400
}

// VerifyToken 校验 SSO 签发的 JWT（JWKS 验签 + issuer），返回 claims。
func (c *Client) VerifyToken(ctx context.Context, raw string) (map[string]any, error) {
	c.once.Do(func() {
		c.keySet, c.keyErr = jwk.Fetch(ctx, c.cfg.JWKSURI)
	})
	if c.keyErr != nil {
		return nil, fmt.Errorf("获取 JWKS 失败: %w", c.keyErr)
	}

	token, err := jwt.ParseString(raw,
		jwt.WithKeySet(c.keySet),
		jwt.WithIssuer(c.cfg.Issuer),
		jwt.WithValidate(true),
	)
	if err != nil {
		return nil, fmt.Errorf("令牌无效: %w", err)
	}

	claims := map[string]any{}
	for key, value := range token.PrivateClaims() {
		claims[key] = value
	}
	if sub := token.Subject(); sub != "" {
		claims["sub"] = sub
	}
	if v, ok := token.Get("preferred_username"); ok {
		claims["preferred_username"] = v
	}
	return claims, nil
}

func (c *Client) postForm(ctx context.Context, endpoint string, form url.Values) (map[string]any, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("SSO 不可达: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("SSO 换取 token 失败: HTTP %d", resp.StatusCode)
	}
	return decodeJSON(resp.Body)
}

func decodeJSON(body io.Reader) (map[string]any, error) {
	var payload map[string]any
	if err := json.NewDecoder(body).Decode(&payload); err != nil {
		return nil, err
	}
	return payload, nil
}
