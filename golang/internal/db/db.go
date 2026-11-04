// Package db 提供 MySQL 连接池（对标 nodejs db.js 的 mysql2 pool）。
package db

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/go-sql-driver/mysql"

	"antx/golang-template/internal/config"
)

// Open 创建 MySQL 连接池；连接信息与 springboot/nodejs 模板一致。
func Open(cfg config.Config) (*sql.DB, error) {
	mc := mysql.NewConfig()
	mc.User = cfg.DBUser
	mc.Passwd = cfg.DBPassword
	mc.Net = "tcp"
	mc.Addr = fmt.Sprintf("%s:%s", cfg.DBHost, cfg.DBPort)
	mc.DBName = cfg.DBName
	mc.ParseTime = true
	mc.Loc = time.Local
	mc.Params = map[string]string{"charset": "utf8mb4"}

	pool, err := sql.Open("mysql", mc.FormatDSN())
	if err != nil {
		return nil, err
	}
	pool.SetMaxOpenConns(10)
	pool.SetMaxIdleConns(10)
	pool.SetConnMaxLifetime(0)
	return pool, nil
}
