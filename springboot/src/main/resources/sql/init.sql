-- ============================================
-- AntX Spring Boot 模板 示例表
-- 执行前先创建数据库：CREATE DATABASE antx_template DEFAULT CHARACTER SET utf8mb4;
-- ============================================

USE antx_template;

-- 存量库若之前用 t_user，先改名（新库可忽略）：
-- RENAME TABLE t_user TO users;

CREATE TABLE IF NOT EXISTS `users`
(
    `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    `uid`         VARCHAR(64)  NOT NULL COMMENT 'SSO 用户 uid（access_token 的 sub，方案A：子应用角色本地化的身份键）',
    `role`        VARCHAR(20)  NOT NULL DEFAULT 'USER' COMMENT '子应用角色：ADMIN-管理员，USER-普通用户（新登录用户默认 USER）',
    `status`      TINYINT      NOT NULL DEFAULT 1 COMMENT '启停状态：1-启用，0-禁用',
    `last_login_at` DATETIME   NULL COMMENT '上次登录时间（SSO 登录成功时写入，从未登录为 NULL）',
    `deleted`     TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除（回收站）',
    `version`     INT          NOT NULL DEFAULT 1 COMMENT '乐观锁版本号',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_uid` (`uid`),
    KEY `idx_deleted_create_time` (`deleted`, `create_time`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_general_ci COMMENT ='用户表（子应用以 SSO uid 为身份键，用户名/昵称/邮箱由 SSO 提供，本地不维护）';

-- 存量表补列表索引（新库已包含，可忽略）：
-- ALTER TABLE users ADD INDEX idx_deleted_create_time (deleted, create_time);

-- ============================================
-- 角色表（子应用本地角色字典，默认内置 ADMIN / USER）
-- ============================================
CREATE TABLE IF NOT EXISTS `roles`
(
    `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    `code`        VARCHAR(32)  NOT NULL COMMENT '角色编码（上报 Spring Security 时包装为 ROLE_*）',
    `name`        VARCHAR(64)  NOT NULL COMMENT '角色名称',
    `description` VARCHAR(255) NULL COMMENT '角色描述',
    `built_in`    TINYINT      NOT NULL DEFAULT 0 COMMENT '内置角色：1-内置（不可删除）',
    `status`      TINYINT      NOT NULL DEFAULT 1 COMMENT '状态：1-启用，0-禁用',
    `sort`        INT          NOT NULL DEFAULT 0 COMMENT '排序（升序）',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_code` (`code`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_general_ci COMMENT ='角色表（子应用本地角色字典，内置 ADMIN / USER）';

-- 默认角色：ADMIN（管理员）、USER（普通用户），均为内置角色，不可删除
INSERT INTO `roles` (`code`, `name`, `description`, `built_in`, `status`, `sort`)
VALUES ('ADMIN', '管理员', '拥有管理后台全部权限', 1, 1, 1),
       ('USER', '普通用户', '仅可访问普通功能', 1, 1, 2)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`),
                        `description` = VALUES(`description`),
                        `built_in` = 1;

-- 存量表升级：users 增加上次登录时间
-- ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL COMMENT '上次登录时间' AFTER status;

-- ============ 初始数据（执行一次） ============
-- 初始管理员：uid=1 的用户默认为 ADMIN（管理员判定同时以 sso.admin-uid 配置为准，默认 1）。
INSERT INTO users (id, uid, role, status, deleted)
VALUES (1, '1', 'ADMIN', 1, 0)
ON DUPLICATE KEY UPDATE role = 'ADMIN';

-- 存量表升级（已有 users 时执行）：
-- ALTER TABLE users
--     ADD COLUMN status TINYINT NOT NULL DEFAULT 1 COMMENT '启停状态：1-启用，0-禁用' AFTER role,
--     RENAME COLUMN sso_uid TO uid,                 -- 若已有 sso_uid 列
--     DROP COLUMN username,
--     DROP COLUMN nickname,
--     DROP COLUMN email,
--     DROP INDEX uk_username,
--     ADD UNIQUE KEY uk_uid (uid);
-- INSERT INTO users (id, uid, role) VALUES (1, '1', 'ADMIN') ON DUPLICATE KEY UPDATE role = 'ADMIN';

-- 可选：把其他 SSO 用户（uid=1001）设为管理员
-- INSERT INTO users (uid, role) VALUES ('1001', 'ADMIN')
--     ON DUPLICATE KEY UPDATE role = 'ADMIN';
