// Package database 数据库连接（对标 Spring Boot 的 DataSource 配置）。
package database

import (
	"log"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/antx/gin-template/internal/model/entity"
	"github.com/antx/gin-template/pkg/config"
)

// Open 打开数据库连接。
func Open(cfg *config.Config) (*gorm.DB, error) {
	logLevel := logger.Silent
	if cfg.DB.LogSQL {
		logLevel = logger.Info
	}

	db, err := gorm.Open(mysql.Open(cfg.DB.DSN), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// 开发期可自动建表；生产请执行 sql/init.sql
	if cfg.DB.AutoMigrate {
		if err := db.AutoMigrate(&entity.User{}); err != nil {
			log.Printf("[db] AutoMigrate 失败: %v", err)
		}
	}

	log.Println("[db] 数据库连接成功")
	return db, nil
}
