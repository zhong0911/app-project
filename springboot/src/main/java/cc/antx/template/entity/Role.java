package cc.antx.template.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 角色实体（对应表 roles）。
 *
 * <p>子应用本地角色字典：内置 {@code ADMIN} / {@code USER}，可扩展自定义角色。
 * 用户在 {@code users.role} 中存的就是这里的 {@code code}；注入 Spring Security 时
 * 统一包装为 {@code ROLE_<code>}（见 {@link cc.antx.template.config.security.LocalRoleGrantedAuthoritiesConverter}）。</p>
 */
@Getter
@Setter
@TableName("roles")
public class Role {

    /** 主键（数据库自增） */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 角色编码（唯一，大写，如 ADMIN / USER / AUDITOR） */
    private String code;

    /** 角色名称（展示用，如 管理员 / 普通用户） */
    private String name;

    /** 角色描述 */
    private String description;

    /** 内置角色：1-内置（不可删除），0-普通 */
    private Integer builtIn;

    /** 状态：1-启用，0-禁用（禁用的角色不可再分配给用户） */
    private Integer status;

    /** 排序（升序） */
    private Integer sort;

    /** 创建时间（自动填充） */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    /** 更新时间（自动填充） */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
