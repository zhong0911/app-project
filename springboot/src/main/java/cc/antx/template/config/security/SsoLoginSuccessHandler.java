package cc.antx.template.config.security;

import cc.antx.template.common.utils.RedirectUriUtils;
import cc.antx.template.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * SSO 登录成功后的跳转处理。
 *
 * <p>落地顺序：</p>
 * <ol>
 *   <li>会话里的 {@code sso_redirect_uri}（前端 /sso/authorize?redirect_uri=xxx 透传，回调时消费一次）；</li>
 *   <li>没有或校验不通过 → {@code sso.login-success-url}（默认 /api/auth/me，便于接口联调；
 *       生产可配成前端首页）。</li>
 * </ol>
 *
 * <p><b>为什么不用 defaultSuccessUrl</b>：Spring Security 的默认重定向策略会把相对路径改写成
 * 基于请求 Host 的绝对地址，开发环境经 Vite 代理（changeOrigin 改写 Host 为 8080）时会变成
 * {@code http://localhost:8080/admin/users}，直接把浏览器带离前端。这里直接写 Location 头，
 * 相对路径由浏览器按当前页面源解析，前端 3000 与生产同域都能正确落地。</p>
 */
@Slf4j
@Component
public class SsoLoginSuccessHandler implements AuthenticationSuccessHandler {

    /** 会话中保存回跳地址的 key（/sso/authorize 写入，本类消费） */
    public static final String SESSION_REDIRECT_KEY = "sso_redirect_uri";

    /** 兜底落地地址：授权链路没带回跳地址时使用 */
    private final String loginSuccessUrl;

    /** 绝对回跳地址允许的来源（CORS 允许来源 + 兜底地址自身 origin） */
    private final List<String> allowedOrigins;

    /** 用户服务：登录成功后刷新 users.last_login_at */
    private final UserService userService;

    public SsoLoginSuccessHandler(
            @Value("${sso.login-success-url:/api/auth/me}") String loginSuccessUrl,
            @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173}") List<String> allowedOrigins,
            UserService userService) {
        this.loginSuccessUrl = loginSuccessUrl;
        this.userService = userService;
        List<String> origins = new ArrayList<>(allowedOrigins == null ? List.of() : allowedOrigins);
        // 兜底地址本身是绝对地址时，其 origin 也视为可信（生产常配成前端首页）
        if (loginSuccessUrl.startsWith("http://") || loginSuccessUrl.startsWith("https://")) {
            origins.add(loginSuccessUrl);
        }
        this.allowedOrigins = List.copyOf(origins);
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        // 记录上次登录时间（uid 即 access_token 的 sub；本地无记录时自动注册为 USER）
        refreshLastLogin(authentication);

        String target = null;
        HttpSession session = request.getSession(false);
        if (session != null) {
            Object stored = session.getAttribute(SESSION_REDIRECT_KEY);
            session.removeAttribute(SESSION_REDIRECT_KEY);
            target = RedirectUriUtils.sanitize(stored instanceof String value ? value : null, allowedOrigins);
        }
        if (target == null) {
            target = loginSuccessUrl;
        }
        // 直接写 Location（相对路径不做绝对化），302 回前端页面
        response.setHeader(HttpHeaders.LOCATION, target);
        response.setStatus(HttpServletResponse.SC_FOUND);
    }

    /** 登录成功后刷新 users.last_login_at；失败不阻断登录流程 */
    private void refreshLastLogin(Authentication authentication) {
        try {
            String uid = null;
            if (authentication.getPrincipal() instanceof OAuth2User oauth2User) {
                // passport-sso 的 sub 就是用户 uid；未返回 sub 时退回 getName()
                Object sub = oauth2User.getAttributes().get("sub");
                uid = sub != null ? String.valueOf(sub) : oauth2User.getName();
            } else if (authentication.getPrincipal() != null) {
                uid = authentication.getName();
            }
            userService.touchLastLogin(uid);
        } catch (RuntimeException e) {
            log.warn("刷新上次登录时间失败: {}", e.getMessage());
        }
    }
}

