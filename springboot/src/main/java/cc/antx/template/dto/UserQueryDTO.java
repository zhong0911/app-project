package cc.antx.template.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;

/**
 * 用户分页查询入参（DTO）。
 */
@Getter
@Setter
public class UserQueryDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 当前页码 */
    @Min(value = 1, message = "页码不能小于 1")
    private long pageNum = 1;

    /** 每页条数 */
    @Min(value = 1, message = "每页条数不能小于 1")
    @Max(value = 500, message = "每页条数不能超过 500")
    private long pageSize = 10;

    /** SSO 用户 uid（精确查询） */
    private String uid;

    /** 子应用角色（精确查询） */
    private String role;

    /** 启停状态（精确查询：1-启用，0-禁用） */
    private Integer status;
}
