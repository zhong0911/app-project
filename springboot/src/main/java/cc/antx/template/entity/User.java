package cc.antx.template.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.Version;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 用户实体（对应表 users）。
 *
 * <p>实体只负责持久化映射，不直接暴露给前端；出参统一走 {@link cc.antx.template.vo.UserVO}。</p>
 */
@Getter
@Setter
@TableName("users")
public class User {

    /** 主键（数据库自增） */
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * SSO 用户 uid（access_token 的 sub，唯一键）。
     *
     * <p>子应用以 SSO 身份为准：用户名/昵称等资料由 SSO 提供，本地不再维护。
     * 此 uid 用于方案A——token 取 sub(=uid) 查本地表注入角色。</p>
     */
    private String uid;

    /** 子应用角色：ADMIN-管理员，USER-普通用户（默认 USER；管理员由 sso.admin-uid 指定） */
    private String role;

    /** 启停状态：1-启用，0-禁用（禁用后该用户无法访问管理接口） */
    private Integer status;

    /** 逻辑删除标记：0-未删除，1-已删除（进入回收站） */
    @TableLogic
    private Integer deleted;

    /** 乐观锁版本号 */
    @Version
    private Integer version;

    /** 创建时间（自动填充） */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    /** 更新时间（自动填充） */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
