package cc.antx.template.config.security;

import cc.antx.template.common.enums.ResultCode;
import cc.antx.template.common.result.Result;
import cc.antx.template.common.utils.JsonUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * 未认证访问的统一响应（401）。
 *
 * <p>API 场景下，未登录访问受保护接口返回统一 Result JSON，而不是重定向到登录页。</p>
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(JsonUtils.toJsonString(Result.error(ResultCode.UNAUTHORIZED)));
    }
}
