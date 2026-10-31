package cc.antx.template.controller;

import cc.antx.template.common.result.Result;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 认证相关接口。
 *
 * <p>三种登录态统一返回当前用户信息：</p>
 * <ul>
 *   <li><b>SSO 浏览器登录</b>（OAuth2 Client，OAuth2AuthenticationToken）</li>
 *   <li><b>SSO Bearer Token</b>（资源服务器，JwtAuthenticationToken）</li>
 *   <li><b>本地联调</b>（httpBasic 内存用户）</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    /**
     * 获取当前登录用户信息。
     */
    @GetMapping("/me")
    public Result<Map<String, Object>> me(Authentication authentication) {
        Map<String, Object> data = new HashMap<>();
        if (authentication == null) {
            return Result.success(data);
        }

        data.put("authenticated", authentication.isAuthenticated());
        data.put("authorities",
                authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList());

        // 场景一：SSO 浏览器登录（OAuth2 Client 授权码登录后）
        if (authentication instanceof OAuth2AuthenticationToken token) {
            OAuth2User oauth2User = token.getPrincipal();
            data.put("type", "sso-login");
            data.put("clientRegistrationId", token.getAuthorizedClientRegistrationId());
            data.put("name", oauth2User.getName());
            data.put("attributes", oauth2User.getAttributes());
            return Result.success(data);
        }

        // 场景二：SSO Bearer Token（资源服务器）
        if (authentication instanceof JwtAuthenticationToken) {
            JwtAuthenticationToken jwtToken = (JwtAuthenticationToken) authentication;
            Jwt jwt = jwtToken.getToken();
            data.put("type", "sso-jwt");
            data.put("subject", jwt.getSubject());
            data.put("claims", jwt.getClaims());
            return Result.success(data);
        }

        // 场景三：本地联调 httpBasic（内存用户）
        data.put("type", "basic");
        data.put("name", authentication.getName());
        return Result.success(data);
    }
}
