package cc.antx.template.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;

/**
 * 更新用户请求入参（DTO）。
 *
 * <p>子应用以 SSO 身份（uid）为准，uid 不可修改；这里用于调整本地角色（如把 USER 升为 ADMIN）。</p>
 */
@Getter
@Setter
public class UserUpdateDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 用户 ID */
    @NotNull(message = "用户 ID 不能为空")
    private Long id;

    /** 子应用角色：ADMIN-管理员，USER-普通用户 */
    @NotBlank(message = "角色不能为空")
    private String role;
}
