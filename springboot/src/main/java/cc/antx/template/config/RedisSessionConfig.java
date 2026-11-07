package cc.antx.template.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.data.redis.config.annotation.web.http.EnableRedisHttpSession;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

/**
 * Spring Session —— Redis 会话存储（手动启用）。
 *
 * <p><b>为什么需要手动启用</b>：Spring Boot 4 重构了自动配置组织，
 * 把各功能模块拆成独立 jar（如 spring-boot-data-redis），其中<b>已不包含</b>
 * Spring Session 的自动配置（Boot 3 时代由 spring-boot-autoconfigure 自动启用）。
 * 因此必须显式加 {@code @EnableRedisHttpSession}，会话（HttpSession，
 * 含 OAuth2 的 access_token / refresh_token）才会真正存进 Redis，
 * 而不是 Tomcat 进程内存。</p>
 *
 * <p>启用后：多实例共享会话、应用重启不掉线、token 落 Redis。
 * {@code spring.session.timeout}（30 分钟）与 namespace 由注解参数控制。</p>
 *
 * <p>会话 Cookie 的 HttpOnly / SameSite / Secure 由 {@link #cookieSerializer} 显式设置：
 * Spring Session 使用自己的 Cookie 序列化器，不读取 {@code server.servlet.session.cookie.*}。</p>
 */
@Configuration
@EnableRedisHttpSession(
        maxInactiveIntervalInSeconds = 30 * 60, // 会话有效期 30 分钟
        redisNamespace = "spring:session"
)
public class RedisSessionConfig {

    /** 与 application.yml 的 server.servlet.session.cookie.* 保持一致；prod 通过该配置开启 Secure */
    @Bean
    public CookieSerializer cookieSerializer(
            @Value("${server.servlet.session.cookie.name:SESSION}") String name,
            @Value("${server.servlet.session.cookie.secure:false}") boolean secure,
            @Value("${server.servlet.session.cookie.same-site:lax}") String sameSite) {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setCookieName(name);
        serializer.setUseHttpOnlyCookie(true);
        serializer.setSameSite(sameSite);
        serializer.setUseSecureCookie(secure);
        return serializer;
    }
}
