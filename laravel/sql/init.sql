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

-- ============ 图床（images） ============
CREATE TABLE IF NOT EXISTS `images`
(
    `id`           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    `uuid`         VARCHAR(32)  NOT NULL COMMENT '图片直链标识（/i/{uuid}）',
    `origin_name`  VARCHAR(255) NULL COMMENT '原始文件名',
    `ext`          VARCHAR(16)  NOT NULL DEFAULT '' COMMENT '扩展名（按内容识别，不含点）',
    `mime_type`    VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '文件内容识别出的 MIME',
    `size`         BIGINT       NOT NULL DEFAULT 0 COMMENT '字节大小',
    `hash`         VARCHAR(64)  NOT NULL DEFAULT '' COMMENT 'sha256，用于同内容去重',
    `width`        INT          NULL COMMENT '像素宽',
    `height`       INT          NULL COMMENT '像素高',
    `storage_key`  VARCHAR(512) NOT NULL DEFAULT '' COMMENT '存储对象 key（本地磁盘/MinIO）',
    `uid`          VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '上传者 SSO uid',
    `visit_count`  BIGINT       NOT NULL DEFAULT 0 COMMENT '访问次数',
    `deleted`      TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-正常，1-回收站',
    `version`      INT          NOT NULL DEFAULT 1 COMMENT '乐观锁版本号',
    `create_time`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_uuid` (`uuid`),
    KEY `idx_deleted_create_time` (`deleted`, `create_time`),
    KEY `idx_uid` (`uid`),
    KEY `idx_hash` (`hash`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_general_ci COMMENT ='图床图片表（uuid 为直链标识，hash 用于同内容去重）';
