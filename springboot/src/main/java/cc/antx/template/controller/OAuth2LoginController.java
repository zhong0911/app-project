package cc.antx.template.controller;

import cc.antx.template.common.enums.ResultCode;
import cc.antx.template.common.result.Result;
import cc.antx.template.common.utils.RedirectUriUtils;
import cc.antx.template.config.security.SsoLoginSuccessHandler;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizationRequestRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * OAuth2 客户端登录入口（授权码模式，规范路径，全后端统一）。
 *
 * <ul>
 *   <li><b>GET /sso/authorize</b>：构造授权请求（含 state 防 CSRF），302 跳转到授权服务器；
 *       授权请求存会话（本项目会话落 Redis），供回调时校验 state。
 *       可带 {@code redirect_uri}（前端站内路径，如 /admin/users）：校验后存会话，
 *       回调成功后由 {@link SsoLoginSuccessHandler} 跳过去</li>
 *   <li><b>GET /sso/callback</b>：由 Spring Security 的 oauth2Login 过滤器处理
 *       （loginProcessingUrl 配置为 /sso/callback），校验 state、用 client-secret 换 token、
 *       建立会话后跳转到登录成功页</li>
 * </ul>
 *
 * <p>provider 固定为 {@code application.yml} 里 {@code spring.security.oauth2.client.registration} 下的注册名 sso。</p>
 */
@RestController
public class OAuth2LoginController {

    /** SSO 客户端注册名（application.yml 中 spring.security.oauth2.client.registration 下的 key） */
    private static final String PROVIDER = "sso";

    /** 授权请求解析器：由注册表构造跳转 URL（redirect-uri 已在 application.yml 固定为 {baseUrl}/sso/callback） */
    private final OAuth2AuthorizationRequestResolver authorizationRequestResolver;

    /** 授权请求存储：与 oauth2Login 默认一致（HttpSession，本项目会话落 Redis） */
    private final HttpSessionOAuth2AuthorizationRequestRepository authorizationRequestRepository =
            new HttpSessionOAuth2AuthorizationRequestRepository();

    /** 绝对回跳地址允许的来源（与 SsoLoginSuccessHandler 共用同一份 CORS 白名单） */
    private final List<String> allowedRedirectOrigins;

    public OAuth2LoginController(ClientRegistrationRepository clientRegistrationRepository,
                                 @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173}") List<String> allowedRedirectOrigins) {
        this.authorizationRequestResolver =
                new DefaultOAuth2AuthorizationRequestResolver(clientRegistrationRepository, "/sso");
        this.allowedRedirectOrigins = allowedRedirectOrigins;
    }

    /**
     * 跳转到授权服务器。未注册 sso provider 时返回统一 404 JSON。
     *
     * @param redirectUri 登录成功后的回跳地址（前端站内路径；非法则忽略，回调后用 sso.login-success-url）
     */
    @GetMapping("/sso/authorize")
    public ResponseEntity<Result<Void>> authorize(@RequestParam(value = "redirect_uri", required = false) String redirectUri,
                                                  HttpServletRequest request,
                                                  HttpServletResponse response) {
        OAuth2AuthorizationRequest authorizationRequest =
                authorizationRequestResolver.resolve(request, PROVIDER);
        if (authorizationRequest == null) {
            // provider 未注册
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Result.error(ResultCode.NOT_FOUND));
        }
        // 回跳地址存会话（回调成功后消费一次）；与 state 同会话，登录链路的篡改无从下手
        String target = RedirectUriUtils.sanitize(redirectUri, allowedRedirectOrigins);
        HttpSession session = request.getSession(true);
        if (target == null) {
            session.removeAttribute(SsoLoginSuccessHandler.SESSION_REDIRECT_KEY);
        } else {
            session.setAttribute(SsoLoginSuccessHandler.SESSION_REDIRECT_KEY, target);
        }
        // 存会话（state 防 CSRF），回调时由 oauth2Login 过滤器校验并消费
        authorizationRequestRepository.saveAuthorizationRequest(authorizationRequest, request, response);
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, authorizationRequest.getAuthorizationRequestUri())
                .build();
    }
}
