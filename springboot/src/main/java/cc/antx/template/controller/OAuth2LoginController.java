package cc.antx.template.controller;

import cc.antx.template.common.enums.ResultCode;
import cc.antx.template.common.result.Result;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizationRequestRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * OAuth2 客户端登录入口（授权码模式，规范路径，全后端统一）。
 *
 * <ul>
 *   <li><b>GET /oauth2/{provider}/authorize</b>：构造授权请求（含 state 防 CSRF），302 跳转到授权服务器；
 *       授权请求存会话（本项目会话落 Redis），供回调时校验 state</li>
 *   <li><b>GET /oauth2/{provider}/callback</b>：由 Spring Security 的 oauth2Login 过滤器处理
 *       （loginProcessingUrl 配置为 /oauth2/{provider}/callback 同级通配），校验 state、用 client-secret 换 token、
 *       建立会话后跳转到登录成功页</li>
 * </ul>
 *
 * <p>provider 即 {@code application.yml} 里 {@code spring.security.oauth2.client.registration} 下的注册名（默认 sso）。</p>
 */
@RestController
public class OAuth2LoginController {

    /** 授权请求解析器：由注册表构造跳转 URL（baseUri 仅用于单参数 resolve，这里用不到，占位即可） */
    private final OAuth2AuthorizationRequestResolver authorizationRequestResolver;

    /** 授权请求存储：与 oauth2Login 默认一致（HttpSession，本项目会话落 Redis） */
    private final HttpSessionOAuth2AuthorizationRequestRepository authorizationRequestRepository =
            new HttpSessionOAuth2AuthorizationRequestRepository();

    public OAuth2LoginController(ClientRegistrationRepository clientRegistrationRepository) {
        this.authorizationRequestResolver =
                new DefaultOAuth2AuthorizationRequestResolver(clientRegistrationRepository, "/oauth2");
    }

    /**
     * 跳转到授权服务器。未知 provider 返回统一 404 JSON。
     */
    @GetMapping("/oauth2/{provider}/authorize")
    public ResponseEntity<Result<Void>> authorize(@PathVariable String provider,
                                                  HttpServletRequest request,
                                                  HttpServletResponse response) {
        OAuth2AuthorizationRequest authorizationRequest =
                authorizationRequestResolver.resolve(request, provider);
        if (authorizationRequest == null) {
            // provider 未注册
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Result.error(ResultCode.NOT_FOUND));
        }
        // 存会话（state 防 CSRF），回调时由 oauth2Login 过滤器校验并消费
        authorizationRequestRepository.saveAuthorizationRequest(authorizationRequest, request, response);
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, authorizationRequest.getAuthorizationRequestUri())
                .build();
    }
}
