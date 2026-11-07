package handler

import (
	"net/url"
	"strings"
)

// maxRedirectURILength 回跳地址最大长度（浏览器与各类代理的兼容上限）。
const maxRedirectURILength = 2048

// sanitizeRedirectURI 校验登录成功后的回跳地址（防开放重定向）。
//
// 前端访问 /sso/authorize 时用 redirect_uri 透传要回跳的页面地址，后端存会话、
// 回调成功后 302 过去。规则：
//  1. 站内相对路径（单个 / 开头）：放行，浏览器按当前页面源解析；
//  2. 绝对 http(s) 地址：origin 必须命中 CORS 允许来源白名单（前端传的就是这种，前后端分域也一致）；
//  3. 协议相对（//evil.com）、反斜杠变体（/\evil.com）、控制字符、超长地址：判非法。
//
// 非法返回空串，由调用方回退 cfg.SSO.LoginSuccessURL。
func sanitizeRedirectURI(raw string, allowedOrigins []string) string {
	target := strings.TrimSpace(raw)
	if target == "" || len(target) > maxRedirectURILength {
		return ""
	}
	// 控制字符（含换行）会污染响应头
	for _, ch := range target {
		if ch < 0x20 || ch == 0x7f {
			return ""
		}
	}
	if strings.HasPrefix(target, "/") {
		if strings.HasPrefix(target, "//") || strings.HasPrefix(target, "/\\") {
			return ""
		}
		return target
	}
	lower := strings.ToLower(target)
	if !strings.HasPrefix(lower, "http://") && !strings.HasPrefix(lower, "https://") {
		return ""
	}
	origin := originOf(target)
	if origin == "" {
		return ""
	}
	for _, allowed := range allowedOrigins {
		if candidate := originOf(strings.TrimSpace(allowed)); candidate != "" && candidate == origin {
			return target
		}
	}
	return ""
}

// originOf 提取 origin（scheme://host[:port]，默认端口省略）；非法地址返回空串。
func originOf(raw string) string {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Host == "" {
		return ""
	}
	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "http" && scheme != "https" {
		return ""
	}
	host := strings.ToLower(parsed.Hostname())
	if host == "" {
		return ""
	}
	port := parsed.Port()
	defaultPort := (scheme == "http" && (port == "" || port == "80")) ||
		(scheme == "https" && (port == "" || port == "443"))
	if defaultPort {
		return scheme + "://" + host
	}
	return scheme + "://" + host + ":" + port
}
