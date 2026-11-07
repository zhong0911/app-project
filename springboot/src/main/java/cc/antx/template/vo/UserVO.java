package cc.antx.template.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 用户响应出参（VO）。
 *
 * <p>出参模型：只暴露需要返回给前端的字段，隐藏实体内部字段（deleted/version 等）。</p>
 */
@Getter
@Setter
public class UserVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 用户 ID */
    private Long id;

    /** SSO 用户 uid（= access_token 的 sub） */
    private String uid;

    /** 子应用角色：ADMIN-管理员，USER-普通用户 */
    private String role;

    /** 启停状态：1-启用，0-禁用 */
    private Integer status;

    /** 逻辑删除标记：0-正常，1-回收站 */
    private Integer deleted;

    /** 创建时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createTime;

    /** 更新时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updateTime;
}
