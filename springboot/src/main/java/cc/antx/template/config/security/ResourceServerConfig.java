package cc.antx.template.config.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.jwt.JwtException;

/**
 * 资源服务器 JWT 解码器（懒初始化）。
 *
 * <p>懒初始化：只在首次有 Bearer token 需要校验时才从 SSO 拉取 discovery/JWKS，
 * 避免应用启动时因 SSO 未启动而直接失败。</p>
 *
 * <p>默认 {@link JwtDecoders#fromIssuerLocation} 在 SSO 不可达或 token 无效时抛
 * {@link JwtException}（RuntimeException），框架会当 500 返回。这里统一包装成
 * {@link OAuth2AuthenticationException}(invalid_token)，交给
 * {@code RestAuthenticationEntryPoint} 返回统一的 401 Result JSON。</p>
 */
@Configuration
public class ResourceServerConfig {

    @Bean
    public JwtDecoder jwtDecoder(@Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuerUri) {
        return new JwtDecoder() {
            private volatile JwtDecoder delegate;

            private JwtDecoder delegate() {
                JwtDecoder d = delegate;
                if (d == null) {
                    synchronized (this) {
                        d = delegate;
                        if (d == null) {
                            d = JwtDecoders.fromIssuerLocation(issuerUri);
                            delegate = d;
                        }
                    }
                }
                return d;
            }

            @Override
            public Jwt decode(String token) throws JwtException {
                try {
                    return delegate().decode(token);
                } catch (OAuth2AuthenticationException ex) {
                    // 令牌本身无效：保持原异常，交给资源服务器 401 入口点
                    throw ex;
                } catch (Exception ex) {
                    // SSO 不可达 / JWKS 拉取失败 / 签名校验失败等：统一转 invalid_token，走 401 JSON
                    throw new OAuth2AuthenticationException(
                            new OAuth2Error("invalid_token", "令牌校验失败（SSO 不可达或令牌无效）", null), ex);
                }
            }
        };
    }
}
