package cc.antx.template.config.security;

import cc.antx.template.entity.User;
import cc.antx.template.service.UserService;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Collection;
import java.util.Collections;

/**
 * 方案B：子应用自治角色（角色本地化到子应用）。
 *
 * <p><b>设计原则：SSO 只认证（token 证明"你是谁"），子应用负责授权（"你能干什么"）。</b></p>
 *
 * <p>流程：token 取 {@code sub}（passport-sso 的 sub 就是用户 uid）→ 查子应用本地 {@code users.uid}
 * → 取其 {@code role}（如 VPN_ADMIN / VPN_USER）→ 包装为 {@code ROLE_VPN_ADMIN} / {@code ROLE_VPN_USER}
 * 注入 Spring Security。子应用接口用 {@code @PreAuthorize("hasRole('VPN_ADMIN')")} 判定。</p>
 *
 * <p><b>角色规则：</b>角色由子应用本地表管理（SSO 不管业务角色）。本地查不到该 uid →
 * 视为未注册，返回空 authorities（无权限）。新用户如需使用需先在子应用本地注册并设角色。</p>
 */
@Component
public class LocalRoleGrantedAuthoritiesConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    private final UserService userService;

    public LocalRoleGrantedAuthoritiesConverter(UserService userService) {
        this.userService = userService;
    }

    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        // passport-sso 的 access_token 中 sub 即用户 uid
        String uid = jwt.getSubject();
        if (!StringUtils.hasText(uid)) {
            return Collections.emptyList();
        }

        // 查子应用本地表获取该用户角色
        User user = userService.getByUid(uid);
        if (user == null || !StringUtils.hasText(user.getRole())) {
            // 未在子应用本地表注册/未配角色 → 无任何子应用角色（无权限）
            return Collections.emptyList();
        }

        // role 统一包装为 ROLE_*（如 VPN_ADMIN -> ROLE_VPN_ADMIN），供 hasRole('VPN_ADMIN') 使用
        String role = "ROLE_" + user.getRole().toUpperCase();
        return Collections.singletonList(new SimpleGrantedAuthority(role));
    }
}
