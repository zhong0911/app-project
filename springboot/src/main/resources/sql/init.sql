-- ============================================
-- AntX Spring Boot 模板 示例表
-- 执行前先创建数据库：CREATE DATABASE antx_template DEFAULT CHARACTER SET utf8mb4;
-- ============================================

USE antx_template;

CREATE TABLE IF NOT EXISTS `t_user`
(
    `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    `uid`         VARCHAR(64)  NOT NULL COMMENT 'SSO 用户 uid（access_token 的 sub，方案A：子应用角色本地化的身份键）',
    `role`        VARCHAR(20)  NOT NULL DEFAULT 'USER' COMMENT '子应用角色：ADMIN-管理员，USER-普通用户（新登录用户默认 USER）',
    `deleted`     TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    `version`     INT          NOT NULL DEFAULT 1 COMMENT '乐观锁版本号',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_uid` (`uid`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_general_ci COMMENT ='用户表（子应用以 SSO uid 为身份键，用户名/昵称/邮箱由 SSO 提供，本地不维护）';

-- ============ 初始数据（执行一次） ============
-- 初始管理员：uid=1 的用户默认为 ADMIN，其余新登录用户自动为 USER。
INSERT INTO t_user (id, uid, role)
VALUES (1, '1', 'ADMIN')
ON DUPLICATE KEY UPDATE role = 'ADMIN';

-- 存量表升级（已有 t_user 时执行）：
-- ALTER TABLE t_user
--     RENAME COLUMN sso_uid TO uid,                 -- 若已有 sso_uid 列
--     DROP COLUMN username,
--     DROP COLUMN nickname,
--     DROP COLUMN email,
--     DROP INDEX uk_username,
--     ADD UNIQUE KEY uk_uid (uid);
-- INSERT INTO t_user (id, uid, role) VALUES (1, '1', 'ADMIN') ON DUPLICATE KEY UPDATE role = 'ADMIN';

-- 可选：把其他 SSO 用户（uid=1001）设为管理员
-- INSERT INTO t_user (uid, role) VALUES ('1001', 'ADMIN')
--     ON DUPLICATE KEY UPDATE role = 'ADMIN';
