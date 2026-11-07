package cc.antx.template.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;

/**
 * 角色新增 / 更新请求入参（DTO）。
 *
 * <p>角色编码统一大写，只允许字母、数字与下划线，便于包装成 {@code ROLE_*} 权限名。</p>
 */
@Getter
@Setter
public class RoleDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 角色编码（唯一）：ADMIN / USER / AUDITOR … */
    @NotBlank(message = "角色编码不能为空")
    @Pattern(regexp = "^[A-Za-z][A-Za-z0-9_]{1,31}$", message = "角色编码只允许字母、数字与下划线，长度 2-32")
    private String code;

    /** 角色名称 */
    @NotBlank(message = "角色名称不能为空")
    @Size(max = 64, message = "角色名称长度不能超过 64")
    private String name;

    /** 角色描述 */
    @Size(max = 255, message = "角色描述长度不能超过 255")
    private String description;

    /** 状态：1-启用，0-禁用（不传默认启用） */
    private Integer status;

    /** 排序（不传默认 0） */
    private Integer sort;
}
