package cc.antx.template.controller;

import cc.antx.template.common.result.PageResult;
import cc.antx.template.common.result.Result;
import cc.antx.template.dto.UserCreateDTO;
import cc.antx.template.dto.UserQueryDTO;
import cc.antx.template.service.CurrentUserService;
import cc.antx.template.service.UserService;
import cc.antx.template.vo.UserVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 管理后台用户管理接口（仅管理员可访问）。
 *
 * <p>管理员由 {@code sso.admin-uid} 指定（默认 uid=1）；用户唯一标识为 SSO uid
 * （access_token 的 sub）。所有删除均为软删除，可从回收站恢复。</p>
 */
@Validated
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;
    private final CurrentUserService currentUserService;

    /** 用户列表（不含回收站） */
    @GetMapping
    public Result<PageResult<UserVO>> page(Authentication authentication, @Valid UserQueryDTO dto) {
        currentUserService.requireAdmin(authentication);
        return Result.success(PageResult.of(userService.pageQuery(dto)));
    }

    /** 回收站列表（逻辑删除的用户） */
    @GetMapping("/recycle")
    public Result<PageResult<UserVO>> recycle(Authentication authentication, @Valid UserQueryDTO dto) {
        currentUserService.requireAdmin(authentication);
        return Result.success(PageResult.of(userService.pageRecycle(dto)));
    }

    /** 添加用户：直接指定 SSO uid */
    @PostMapping
    public Result<UserVO> create(Authentication authentication, @Valid @RequestBody UserCreateDTO dto) {
        currentUserService.requireAdmin(authentication);
        return Result.success(userService.createUser(dto));
    }

    /** 启用 / 禁用用户 */
    @PutMapping("/{id}/status")
    public Result<UserVO> updateStatus(Authentication authentication,
                                      @PathVariable Long id,
                                      @RequestBody Map<String, Integer> body) {
        currentUserService.requireAdmin(authentication);
        return Result.success(userService.updateStatus(id, body.get("status")));
    }

    /** 软删除（移入回收站） */
    @DeleteMapping("/{id}")
    public Result<Void> delete(Authentication authentication, @PathVariable Long id) {
        currentUserService.requireAdmin(authentication);
        userService.deleteUser(id);
        return Result.success();
    }

    /** 从回收站恢复 */
    @PostMapping("/{id}/restore")
    public Result<UserVO> restore(Authentication authentication, @PathVariable Long id) {
        currentUserService.requireAdmin(authentication);
        return Result.success(userService.restore(id));
    }

    /** 彻底删除（仅回收站中的用户） */
    @DeleteMapping("/{id}/purge")
    public Result<Void> purge(Authentication authentication, @PathVariable Long id) {
        currentUserService.requireAdmin(authentication);
        userService.purge(id);
        return Result.success();
    }
}
