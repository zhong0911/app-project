package cc.antx.template.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

/**
 * 跨域（CORS）配置。
 *
 * <p>允许前端（本地开发 / 部署域名）跨域访问后端接口。</p>
 *
 * <p><b>注意</b>：SSO 登录态依赖会话 Cookie，因此必须开启 allowCredentials；
 * 开启后不能使用通配来源（*），否则任何站点都能携带用户 Cookie 调用接口。
 * 允许的来源通过 {@code CORS_ALLOWED_ORIGINS} 配置，多个用逗号分隔。</p>
 */
@Configuration
public class WebConfig {

    /** 允许携带凭证的跨域来源（逗号分隔）；生产通过环境变量收紧到实际前端域名 */
    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173}")
    private String allowedOrigins;

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList());
        // 允许携带 Cookie / 凭证
        config.setAllowCredentials(true);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
