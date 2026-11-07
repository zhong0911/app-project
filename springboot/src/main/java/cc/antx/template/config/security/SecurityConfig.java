package cc.antx.template.config.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Spring Security 配置 —— OAuth2 客户端（SSO 登录）+ 资源服务器（Bearer 保护 API）。
 *
 * <p>本模板作为子应用接入 AntX passport-sso（OAuth2 / OIDC 授权服务器）：</p>
 * <ul>
 *   <li>关闭 CSRF（前后端分离 API）</li>
 *   <li><b>OAuth2 Client</b>：浏览器访问 /sso/authorize 跳转 SSO 登录页（规范路径，见 OAuth2LoginController），
 *       SSO 授权后回调 /sso/callback 换取 token、建立会话</li>
 *   <li><b>资源服务器</b>：API 校验 SSO 签发的 Bearer JWT（issuer 自动发现 JWKS 验签）</li>
 *   <li><b>角色本地化（方案B：子应用自治）</b>：token 取 sub(=uid) → 查本地 users 表 role →
 *       注入 ROLE_*（如 ROLE_VPN_ADMIN），子应用接口用 @PreAuthorize("hasRole('VPN_ADMIN')") 判定，
 *       SSO 只管认证，业务角色由子应用本地表管理</li>
 *   <li>httpBasic + 内存用户：仅本地联调用，生产通过 app.security.basic-enabled=false 关闭</li>
 *   <li>未认证 → 401 JSON，无权限 → 403 JSON（统一 Result 格式）</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;
    private final LocalRoleGrantedAuthoritiesConverter localRoleConverter;

    /** OAuth2 登录成功后的重定向地址（默认 API 调试 JSON；生产子应用指向前端首页，如 https://tools.antx.cc） */
    @Value("${sso.login-success-url:/api/auth/me}")
    private String loginSuccessUrl;

    /** 本地联调 httpBasic 开关；生产环境设为 false（见 application-prod.yml） */
    @Value("${app.security.basic-enabled:true}")
    private boolean basicEnabled;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 前后端分离 API，关闭 CSRF
                .csrf(csrf -> csrf.disable())
                // 路径授权：放行登录/回调/错误；其余需认证（Bearer token、SSO 会话或本地 Basic）
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/sso/**",   // SSO 登录入口 /sso/authorize 与回调 /sso/callback
                                "/error",
                                "/favicon.ico"
                        ).permitAll()
                        .anyRequest().authenticated())
                // API 场景不跳表单登录页
                .formLogin(form -> form.disable())
                // OAuth2 Client：回调路径规范为 /sso/callback（与 authorize 入口同级，全后端统一）；
                // 登录成功后重定向到 loginSuccessUrl（前端首页或 /api/auth/me）
                .oauth2Login(oauth2 -> oauth2
                        .loginProcessingUrl("/sso/callback")
                        .defaultSuccessUrl(loginSuccessUrl, true))
                // 资源服务器：校验 SSO 签发的 JWT（Bearer token），认证失败走统一 401 JSON
                .oauth2ResourceServer(rs -> rs
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                        .authenticationEntryPoint(authenticationEntryPoint))
                // 未认证/无权限统一返回 JSON
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler));
        // 本地联调：内存用户 httpBasic；生产关闭后仅保留 SSO 会话 / Bearer
        if (basicEnabled) {
            http.httpBasic(basic -> basic.authenticationEntryPoint(authenticationEntryPoint));
        }
        return http.build();
    }

    /**
     * OAuth2 客户端 token 存储：显式使用 HttpSession。
     *
     * <p>Spring Boot 默认给的是 InMemoryOAuth2AuthorizedClientService（JVM 内存）。
     * 这里换成 HttpSessionOAuth2AuthorizedClientRepository，让 access_token / refresh_token
     * 跟随后端会话一起写入 Redis（Spring Session，见 RedisSessionConfig）。</p>
     */
    @Bean
    public OAuth2AuthorizedClientRepository authorizedClientRepository() {
        return new HttpSessionOAuth2AuthorizedClientRepository();
    }

    /**
     * JWT → authorities 转换器（方案B：子应用自治）。
     * token 取 sub(=uid) → 查本地 users 表 role → 注入 ROLE_*（见 {@link LocalRoleGrantedAuthoritiesConverter}）。
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(localRoleConverter);
        return converter;
    }

    /** 密码编码器（BCrypt） */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * 内存用户（仅本地联调用）。配置项见 application.yml 的 spring.security.user.*；
     * 生产通过 app.security.basic-enabled=false 关闭，不再创建该用户。
     */
    @Bean
    @ConditionalOnProperty(prefix = "app.security", name = "basic-enabled", havingValue = "true", matchIfMissing = true)
    public UserDetailsService userDetailsService(PasswordEncoder encoder,
                                                 @Value("${spring.security.user.name:admin}") String username,
                                                 @Value("${spring.security.user.password:admin123}") String password,
                                                 @Value("${spring.security.user.roles:ADMIN}") String roles) {
        return new InMemoryUserDetailsManager(
                User.withUsername(username)
                        .password(encoder.encode(password))
                        .roles(roles.split(","))
                        .build()
        );
    }
}
