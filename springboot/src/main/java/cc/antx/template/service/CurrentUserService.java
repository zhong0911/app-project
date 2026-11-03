package cc.antx.template.service;

import cc.antx.template.common.enums.ResultCode;
import cc.antx.template.common.exception.BusinessException;
import cc.antx.template.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * 当前 SSO 用户身份解析 + 管理员判定。
 *
 * <p>管理员 uid 通过 {@code sso.admin-uid} 配置（默认 1，可用环境变量 SSO_ADMIN_UID 覆盖）。</p>
 */
@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserService userService;

    /** 管理员 SSO uid（access_token 的 sub） */
    @Value("${sso.admin-uid:1}")
    private String adminUid;

    /** 解析当前登录用户的 SSO uid；未登录返回 null */
    public String currentUid(Authentication authentication) {
        if (authentication == null) {
            return null;
        }
        if (authentication instanceof OAuth2AuthenticationToken token) {
            OAuth2User oauth2User = token.getPrincipal();
            Object sub = oauth2User.getAttributes().get("sub");
            return sub != null ? String.valueOf(sub) : null;
        }
        if (authentication instanceof JwtAuthenticationToken token) {
            return token.getToken().getSubject();
        }
        // 本地联调 httpBasic：以内存用户名作为 uid
        return StringUtils.hasText(authentication.getName()) ? authentication.getName() : null;
    }

    /** 判断给定 uid 是否为管理员 */
    public boolean isAdmin(String uid) {
        return StringUtils.hasText(uid) && adminUid != null && adminUid.equals(uid);
    }

    /**
     * 管理接口鉴权：未登录抛 401，非管理员抛 403，被禁用的管理员抛 403。
     *
     * @return 当前管理员 uid
     */
    public String requireAdmin(Authentication authentication) {
        String uid = currentUid(authentication);
        if (!StringUtils.hasText(uid)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        if (!isAdmin(uid)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅管理员可访问");
        }
        User local = userService.getByUid(uid);
        if (local != null && Integer.valueOf(0).equals(local.getStatus())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "账号已被禁用");
        }
        return uid;
    }

    public String getAdminUid() {
        return adminUid;
    }
}
