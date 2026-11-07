package cc.antx.template.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;

/**
 * 更新用户请求入参（DTO）。
 *
 * <p>子应用以 SSO 身份（uid）为准，uid 不可修改；这里用于调整本地角色（如把 USER 升为 ADMIN）。</p>
 *
 * <p><b>关于 id</b>：管理后台的编辑接口走 {@code PUT /api/admin/users/{id}}，id 来自路径变量、
 * 校验发生在路径绑定之后，因此这里不对 id 做 {@code @NotNull} 约束；服务层统一兜底判空。</p>
 */
@Getter
@Setter
public class UserUpdateDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 用户 ID（接口按 id 操作时由路径变量/请求体提供） */
    private Long id;

    /** 子应用角色：ADMIN-管理员，USER-普通用户 */
    @NotBlank(message = "角色不能为空")
    private String role;
}
