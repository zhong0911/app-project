// Package config 读取环境变量配置（对标 nodejs 的 process.env / SSO_*）。
package config

import "os"

// Config 汇总服务运行所需的全部环境变量。
type Config struct {
	Port string

	DBHost     string
	DBPort     string
	DBName     string
	DBUser     string
	DBPassword string

	SSOClientID         string
	SSOClientSecret     string
	SSOIssuer           string
	SSOAuthorizationURI string
	SSOTokenURI         string
	SSOUserinfoURI      string
	SSORevokeURI        string
	SSOScope            string
	SSOLoginSuccessURL  string
	SSOLogoutURI        string
	SSOAdminUID         string

	SessionCookieSecure bool
}

// Load 从环境变量构造配置，缺省值与 nodejs 模板保持一致。
func Load() Config {
	return Config{
		Port: env("PORT", "8080"),

		DBHost:     env("DB_HOST", "127.0.0.1"),
		DBPort:     env("DB_PORT", "3306"),
		DBName:     env("DB_NAME", "antx_template"),
		DBUser:     env("DB_USER", "root"),
		DBPassword: env("DB_PASSWORD", ""),

		SSOClientID:         env("SSO_CLIENT_ID", ""),
		SSOClientSecret:     env("SSO_CLIENT_SECRET", ""),
		SSOIssuer:           env("SSO_ISSUER", ""),
		SSOAuthorizationURI: env("SSO_AUTHORIZATION_URI", ""),
		SSOTokenURI:         env("SSO_TOKEN_URI", ""),
		SSOUserinfoURI:      env("SSO_USERINFO_URI", ""),
		SSORevokeURI:        env("SSO_REVOKE_URI", ""),
		SSOScope:            env("SSO_SCOPE", "openid,profile,email,roles,permissions"),
		SSOLoginSuccessURL:  env("SSO_LOGIN_SUCCESS_URL", "/"),
		SSOLogoutURI:        env("SSO_LOGOUT_URI", ""),
		SSOAdminUID:         env("SSO_ADMIN_UID", "1"),

		SessionCookieSecure: env("SESSION_COOKIE_SECURE", "false") == "true",
	}
}

func env(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return fallback
}
