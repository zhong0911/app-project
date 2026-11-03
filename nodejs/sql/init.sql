-- ============================================
-- AntX Node.js 模板 用户表
-- 执行前先创建数据库：CREATE DATABASE antx_template DEFAULT CHARACTER SET utf8mb4;
-- ============================================

USE antx_template;

CREATE TABLE IF NOT EXISTS `t_user`
(
    `id`          BIGINT      NOT NULL AUTO_INCREMENT COMMENT '主键',
    `uid`         VARCHAR(64) NOT NULL COMMENT 'SSO 用户 uid（access_token 的 sub，唯一标识）',
    `role`        VARCHAR(20) NOT NULL DEFAULT 'USER' COMMENT '子应用角色：ADMIN-管理员，USER-普通用户',
    `status`      TINYINT     NOT NULL DEFAULT 1 COMMENT '启停状态：1-启用，0-禁用',
    `deleted`     TINYINT     NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除（回收站）',
    `version`     INT         NOT NULL DEFAULT 1 COMMENT '乐观锁版本号',
    `create_time` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_uid` (`uid`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_general_ci COMMENT ='用户表（以 SSO uid 为身份键）';

-- 初始管理员：uid=1（管理员判定以 SSO_ADMIN_UID 配置为准，默认 1）
INSERT INTO t_user (id, uid, role, status, deleted)
VALUES (1, '1', 'ADMIN', 1, 0)
ON DUPLICATE KEY UPDATE role = 'ADMIN';
