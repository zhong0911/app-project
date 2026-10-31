package cc.antx.template.vo;

import lombok.Getter;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;

/**
 * BFF（Backend For Frontend）出参 —— 面向前端的登录态聚合视图。
 *
 * <p>只暴露前端需要的字段（身份 + 子应用角色），隐藏 token 的原始 claims / attributes 等敏感内部信息。</p>
 */
@Getter
@Setter
public class BffUserVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 认证类型：sso-login（浏览器 SSO 登录）/ sso-jwt（Bearer token）/ basic（本地联调） */
    private String authType;

    /** SSO 用户 uid（= access_token 的 sub；basic 登录时为 null） */
    private String uid;

    /** 本地用户主键 ID */
    private Long localId;

    /** 子应用角色：ADMIN / USER（新登录用户默认 USER） */
    private String role;

    /** 用户名（SSO preferred_username；basic 为内存用户名） */
    private String name;
}
