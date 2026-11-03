package cc.antx.template.controller;

import cc.antx.template.common.result.Result;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
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

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    /** SSO 单点退出地址（授权服务器登出端点，env SSO_LOGOUT_URI；未配置则仅退出本应用会话） */
    @Value("${sso.logout-uri:}")
    private String ssoLogoutUrl;

    /** SSO token 撤销端点（Spring Authorization Server 标准路径 /oauth2/revoke，env SSO_REVOKE_URI） */
    @Value("${sso.revoke-uri:}")
    private String revokeUri;

    @Value("${spring.security.oauth2.client.registration.sso.client-id:}")
    private String ssoClientId;

    @Value("${spring.security.oauth2.client.registration.sso.client-secret:}")
    private String ssoClientSecret;

    /** 会话中保存的 OAuth2 token（access_token / refresh_token）来源（HttpSession → Redis） */
    private final OAuth2AuthorizedClientRepository authorizedClientRepository;

    public AuthController(OAuth2AuthorizedClientRepository authorizedClientRepository) {
        this.authorizedClientRepository = authorizedClientRepository;
    }

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

    /**
     * 单点退出：先向 SSO 的 revoke 端点撤销 refresh_token，再销毁本应用会话（SecurityContext + HttpSession）。
     *
     * <p>access_token / refresh_token 由 Spring Security 存在 HttpSession 中，
     * 会话由 Spring Session 落到 Redis；撤销失败仅记日志、不阻塞本地退出。
     * 返回的 ssoLogoutUrl 为授权服务器登出端点
     * （配置了 sso.logout-uri 时），前端整页跳转该地址可完成 SSO 全局退出。</p>
     */
    @PostMapping("/logout")
    public Result<Map<String, Object>> logout(HttpServletRequest request, HttpServletResponse response,
                                             Authentication authentication) {
        // 1. 撤销 SSO 侧 refresh_token（优先），无 refresh_token 则撤销 access_token
        revokeSsoToken(authentication, request);
        // 2. 清理会话中的 OAuth2 客户端 token（Redis 会话随 HttpSession 一起删除）
        if (authentication instanceof OAuth2AuthenticationToken token) {
            authorizedClientRepository.removeAuthorizedClient(
                    token.getAuthorizedClientRegistrationId(), token, request, response);
        }
        // 3. 销毁本应用会话（SecurityContext + HttpSession）
        new SecurityContextLogoutHandler().logout(request, response, authentication);
        Map<String, Object> data = new HashMap<>();
        data.put("ssoLogoutUrl", ssoLogoutUrl.isBlank() ? null : ssoLogoutUrl);
        return Result.success(data);
    }

    /** 调用授权服务器 RFC 7009 revoke 端点撤销会话中的 token；任何异常仅告警。 */
    private void revokeSsoToken(Authentication authentication, HttpServletRequest request) {
        if (revokeUri.isBlank() || !(authentication instanceof OAuth2AuthenticationToken token)) {
            return;
        }
        try {
            OAuth2AuthorizedClient client = authorizedClientRepository.loadAuthorizedClient(
                    token.getAuthorizedClientRegistrationId(), token, request);
            if (client == null) {
                return;
            }
            OAuth2RefreshToken refreshToken = client.getRefreshToken();
            OAuth2AccessToken accessToken = client.getAccessToken();
            String value = refreshToken != null ? refreshToken.getTokenValue()
                    : (accessToken != null ? accessToken.getTokenValue() : null);
            if (value == null) {
                return;
            }
            String hint = refreshToken != null ? "refresh_token" : "access_token";
            String form = "token=" + URLEncoder.encode(value, StandardCharsets.UTF_8)
                    + "&token_type_hint=" + hint
                    + "&client_id=" + URLEncoder.encode(ssoClientId, StandardCharsets.UTF_8)
                    + "&client_secret=" + URLEncoder.encode(ssoClientSecret, StandardCharsets.UTF_8);
            HttpRequest req = HttpRequest.newBuilder(URI.create(revokeUri))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form))
                    .build();
            HttpResponse<Void> resp = HttpClient.newHttpClient()
                    .send(req, HttpResponse.BodyHandlers.discarding());
            log.info("[SSO] revoke {} 完成: status={}", hint, resp.statusCode());
        } catch (Exception e) {
            log.warn("[SSO] revoke 失败（忽略，不阻塞退出）: {}", e.getMessage());
        }
    }
}
