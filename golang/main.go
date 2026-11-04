// AntX Go 模板入口（对标 nodejs / springboot 模板）。
//
// 运行：go run .（或 go build -o app . && ./app）
package main

import (
	"errors"
	"log"
	"net/http"

	"antx/golang-template/internal/config"
	"antx/golang-template/internal/db"
	"antx/golang-template/internal/handler"
)

func main() {
	cfg := config.Load()

	pool, err := db.Open(cfg)
	if err != nil {
		log.Fatalf("[AntX Go] 数据库连接池初始化失败: %v", err)
	}
	defer pool.Close()

	server := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: handler.New(cfg, pool),
	}

	log.Printf("[AntX Go] 服务已启动: http://localhost:%s", cfg.Port)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("[AntX Go] 启动失败: %v", err)
	}
}
