package cc.antx.template.common.aspect;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 接口访问日志切面（可选模块）。
 *
 * <p>自动记录 controller 层每个请求的 HTTP 方法、URI、来源 IP、方法签名与耗时。
 * 不打印请求参数与响应体，避免把敏感数据写进日志。</p>
 *
 * <p><b>如何删除：</b></p>
 * <ol>
 *   <li>pom.xml 移除 {@code spring-boot-starter-aop} 依赖</li>
 *   <li>删除本类（common/aspect/WebLogAspect.java）</li>
 *   <li>application.yml 移除 {@code web.log.enabled} 配置</li>
 * </ol>
 *
 * <p>开关：{@code web.log.enabled: true|false}（默认开启）。</p>
 */
@Slf4j
@Aspect
@Component
@ConditionalOnProperty(name = "web.log.enabled", havingValue = "true", matchIfMissing = true)
public class WebLogAspect {

    /** 拦截 controller 包下所有公开方法 */
    @Around("execution(public * cc.antx.template.controller..*(..))")
    public Object logAround(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();

        String httpMethod = "-";
        String uri = "-";
        String ip = "-";
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpServletRequest request = attrs.getRequest();
            httpMethod = request.getMethod();
            uri = request.getRequestURI();
            ip = request.getRemoteAddr();
        }

        try {
            return joinPoint.proceed();
        } finally {
            long cost = System.currentTimeMillis() - start;
            log.info("HTTP {} {} | ip={} | {}.{} | 耗时 {}ms",
                    httpMethod, uri, ip,
                    joinPoint.getSignature().getDeclaringType().getSimpleName(),
                    joinPoint.getSignature().getName(),
                    cost);
        }
    }
}
