package cc.antx.template.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;

/**
 * 创建用户请求入参（DTO）。
 *
 * <p>入参模型：只含前端需要提交的字段，不包含 id、createTime 等后端生成字段。
 * 子应用以 SSO 身份为准（uid = access_token 的 sub），本地不再维护用户名/昵称。</p>
 */
@Getter
@Setter
public class UserCreateDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** SSO 用户 uid（= access_token 的 sub） */
    @NotBlank(message = "SSO 用户 uid 不能为空")
    @Size(max = 64, message = "uid 长度不能超过 64 个字符")
    private String uid;
}
