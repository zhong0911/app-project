package cc.antx.template.controller;

import cc.antx.template.common.result.Result;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 角色权限示例接口（方案A：子应用角色本地化 + @PreAuthorize 用法）。
 *
 * <p>角色由 SSO token 的 sub(=uid) 查本地 users 表注入，业务接口用 @PreAuthorize 控制：</p>
 * <ul>
 *   <li>{@code @PreAuthorize("hasRole('ADMIN')")} —— 仅管理员</li>
 *   <li>{@code @PreAuthorize("hasAnyRole('ADMIN','USER')")} —— 已登录用户（管理员或普通用户）</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/demo")
public class SecurityDemoController {

    /** 仅 ADMIN 可访问 */
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public Result<String> adminOnly() {
        return Result.success("你是 ADMIN（管理员），接口仅管理员可访问");
    }

    /** 已登录用户（ADMIN 或 USER）可访问 */
    @GetMapping("/user")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public Result<String> anyLoginUser() {
        return Result.success("你是已登录用户（ADMIN 或 USER）");
    }
}
