// Package router 路由注册（对标 Spring Boot 的 @RequestMapping 绑定）。
package router

import (
	"github.com/gin-gonic/gin"

	"github.com/antx/gin-template/internal/handler"
	"github.com/antx/gin-template/internal/middleware"
	"github.com/antx/gin-template/internal/service"
	"github.com/antx/gin-template/internal/session"
	"github.com/antx/gin-template/pkg/config"
	"github.com/antx/gin-template/pkg/sso"
)

// Setup 注册全部路由。
//
// 结构：
//
//	/sso/*                 公开（登录入口 + 回调）
//	/api/auth/*            公开（内部自行判断登录态）
//	/api/bff/*             公开（未登录返回空对象）
//	/api/users/*           需登录
//	/api/admin/users/*     需管理员
//	/api/demo/*            权限示例
func Setup(engine *gin.Engine, cfg *config.Config, store *session.Store, client *sso.Client, users *service.UserService) {
	ssoHandler := handler.NewSsoHandler(cfg, client, store, users)
	authHandler := handler.NewAuthHandler(cfg, client, store)
	bffHandler := handler.NewBffHandler(cfg, users)
	userHandler := handler.NewUserHandler(users)
	adminHandler := handler.NewAdminUserHandler(users)
	demoHandler := handler.NewDemoHandler()

	engine.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "UP"})
	})

	// SSO 登录入口（路径全后端统一）
	engine.GET("/sso/authorize", ssoHandler.Authorize)
	engine.GET("/sso/callback", ssoHandler.Callback)

	api := engine.Group("/api")

	// 认证
	api.GET("/auth/me", authHandler.Me)
	api.POST("/auth/logout", authHandler.Logout)

	// BFF 聚合
	api.GET("/bff/me", bffHandler.Me)

	// 用户（需登录）
	userRoutes := api.Group("/users", middleware.RequireLogin())
	{
		userRoutes.GET("", userHandler.Page)
		userRoutes.POST("", userHandler.Create)
		userRoutes.PUT("", userHandler.Update)
		userRoutes.GET("/:id", userHandler.Detail)
		userRoutes.DELETE("/:id", userHandler.Delete)
	}

	// 管理端（需管理员）
	adminRoutes := api.Group("/admin/users", middleware.RequireAdmin(users))
	{
		adminRoutes.GET("", adminHandler.Page)
		adminRoutes.GET("/recycle", adminHandler.Recycle)
		adminRoutes.POST("", adminHandler.Create)
		adminRoutes.PUT("/:id/status", adminHandler.UpdateStatus)
		adminRoutes.DELETE("/:id", adminHandler.Delete)
		adminRoutes.POST("/:id/restore", adminHandler.Restore)
		adminRoutes.DELETE("/:id/purge", adminHandler.Purge)
	}

	// 权限示例
	demo := api.Group("/demo")
	{
		demo.GET("/admin", middleware.RequireAdmin(users), demoHandler.AdminOnly)
		demo.GET("/user", middleware.RequireLogin(), demoHandler.AnyLoginUser)
	}
}
