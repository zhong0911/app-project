// main 程序入口（对标 Spring Boot 的 TemplateApplication）。
//
// 启动顺序：加载配置 → 连数据库 → 装配中间件 → 注册路由 → 监听端口
package main

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/antx/gin-template/internal/middleware"
	"github.com/antx/gin-template/internal/repository"
	"github.com/antx/gin-template/internal/router"
	"github.com/antx/gin-template/internal/service"
	"github.com/antx/gin-template/internal/session"
	"github.com/antx/gin-template/pkg/config"
	"github.com/antx/gin-template/pkg/database"
	"github.com/antx/gin-template/pkg/sso"
)

func main() {
	cfg := config.Load()

	db, err := database.Open(cfg)
	if err != nil {
		log.Fatalf("[boot] 数据库连接失败: %v", err)
	}

	// 依赖装配（Go 没有内置 DI 容器，全部显式注入）
	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo, cfg.SSO.AdminUID)
	roleRepo := repository.NewRoleRepository(db)
	roleService := service.NewRoleService(roleRepo)
	store := session.NewStore(time.Duration(cfg.Session.MaxAge) * time.Second)
	ssoClient := sso.NewClient(&cfg.SSO)

	if !cfg.App.Debug {
		gin.SetMode(gin.ReleaseMode)
	}

	engine := gin.New()
	engine.Use(gin.Logger(), middleware.Recovery(cfg), middleware.CORS(cfg))
	engine.Use(middleware.SessionMiddleware(store, cfg), middleware.IdentityMiddleware(cfg, ssoClient))

	router.Setup(engine, cfg, store, ssoClient, userService, roleService)

	log.Printf("[boot] %s 已启动: http://localhost:%s", cfg.App.Name, cfg.App.Port)
	log.Printf("[boot] SSO 回调地址: %s", cfg.SSO.RedirectURI)

	if err := engine.Run(":" + cfg.App.Port); err != nil {
		log.Fatalf("[boot] 启动失败: %v", err)
	}
}
