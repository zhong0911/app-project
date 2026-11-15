package middleware

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/antx/gin-template/internal/errno"
	"github.com/antx/gin-template/pkg/config"
	"github.com/antx/gin-template/pkg/response"
)

// Recovery 全局异常兜底（对标 Spring Boot 的 GlobalExceptionHandler 最后一层）。
func Recovery(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("[panic] %v", err)
				message := errno.Message[errno.CodeInternalError]
				c.AbortWithStatusJSON(errno.HTTPStatus(errno.CodeInternalError), response.Error(errno.CodeInternalError, message))
			}
		}()
		c.Next()
	}
}

// CORS 跨域（允许携带 Cookie 的来源，生产必须写具体域名，不能 *）。
func CORS(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" && contains(cfg.CORS.AllowedOrigins, origin) {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization")
		}
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func contains(list []string, target string) bool {
	for _, item := range list {
		if strings.EqualFold(item, target) {
			return true
		}
	}
	return false
}
