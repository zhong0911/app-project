// Package config 读取环境变量（对标 Spring Boot 的 application.yml + .env）。
package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// lookupEnv 便于测试时替换。
var lookupEnv = os.LookupEnv

// Config 全局配置。
type Config struct {
	App      AppConfig
	DB       DBConfig
	Session  SessionConfig
	CORS     CORSConfig
	Security SecurityConfig
	SSO      SSOConfig
}

type AppConfig struct {
	Name  string
	Port  string
	Debug bool
}

type DBConfig struct {
	DSN         string
	LogSQL      bool
	AutoMigrate bool
}

type SessionConfig struct {
	Secret     string
	CookieName string
	MaxAge     int // 秒
}

type CORSConfig struct {
	AllowedOrigins []string
}

type SecurityConfig struct {
	BasicEnabled  bool
	AdminUsername string
	AdminPassword string
}

// SSOConfig AntX passport-sso 接入配置。
type SSOConfig struct {
	Issuer           string
	ClientID         string
	ClientSecret     string
	Scope            string
	RedirectURI      string
	AuthorizationURI string
	TokenURI         string
	UserinfoURI      string
	JWKSURI          string
	RevokeURI        string
	LoginSuccessURL  string
	LogoutURI        string
	AdminUID         string
}

// Load 加载 .env（存在则读）并生成配置。
func Load() *Config {
	// 依次尝试 configs/.env（模板约定）与 .env（根目录放法）
	_ = godotenv.Load("configs/.env")
	if err := godotenv.Load(".env"); err != nil {
		log.Println("[config] 未找到 .env，使用环境变量 / 默认值")
	}

	return &Config{
		App: AppConfig{
			Name:  env("APP_NAME", "gin-template"),
			Port:  env("SERVER_PORT", "8080"),
			Debug: env("DEBUG", "true") == "true",
		},
		DB: DBConfig{
			DSN:         env("DB_DSN", "root:root@tcp(localhost:3306)/antx_template?charset=utf8mb4&parseTime=True&loc=Local"),
			LogSQL:      env("DB_LOG_SQL", "false") == "true",
			AutoMigrate: env("DB_AUTO_MIGRATE", "false") == "true",
		},
		Session: SessionConfig{
			Secret:     env("SESSION_SECRET", "change-me-session-secret"),
			CookieName: env("SESSION_COOKIE_NAME", "SESSION"),
			MaxAge:     envInt("SESSION_MAX_AGE", 1800),
		},
		CORS: CORSConfig{
			AllowedOrigins: splitList(env("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")),
		},
		Security: SecurityConfig{
			BasicEnabled:  env("SECURITY_BASIC_ENABLED", "true") == "true",
			AdminUsername: env("SECURITY_ADMIN_USERNAME", "admin"),
			AdminPassword: env("SECURITY_ADMIN_PASSWORD", "admin123"),
		},
		SSO: SSOConfig{
			Issuer:           env("SSO_ISSUER", "https://passport.antx.cc"),
			ClientID:         env("SSO_CLIENT_ID", "your-sso-client-id"),
			ClientSecret:     env("SSO_CLIENT_SECRET", "your-sso-client-secret"),
			Scope:            env("SSO_SCOPE", "openid,profile,email,roles,permissions"),
			RedirectURI:      env("SSO_REDIRECT_URI", "http://localhost:8080/sso/callback"),
			AuthorizationURI: env("SSO_AUTHORIZATION_URI", "https://passport.antx.cc/oauth2/authorize"),
			TokenURI:         env("SSO_TOKEN_URI", "https://passport.antx.cc/oauth2/token"),
			UserinfoURI:      env("SSO_USERINFO_URI", "https://passport.antx.cc/userinfo"),
			JWKSURI:          env("SSO_JWKS_URI", "https://passport.antx.cc/oauth2/jwks"),
			RevokeURI:        env("SSO_REVOKE_URI", "https://passport.antx.cc/oauth2/revoke"),
			LoginSuccessURL:  env("SSO_LOGIN_SUCCESS_URL", "/api/auth/me"),
			LogoutURI:        env("SSO_LOGOUT_URI", ""),
			AdminUID:         env("SSO_ADMIN_UID", "1"),
		},
	}
}

func env(key, fallback string) string {
	if v, ok := lookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v, ok := lookupEnv(key); ok && v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func splitList(value string) []string {
	items := strings.Split(value, ",")
	result := make([]string, 0, len(items))
	for _, item := range items {
		if trimmed := strings.TrimSpace(item); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
