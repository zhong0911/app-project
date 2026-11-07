package cc.antx.template.controller;

import cc.antx.template.common.result.Result;
import cc.antx.template.dto.RoleDTO;
import cc.antx.template.service.CurrentUserService;
import cc.antx.template.service.RoleService;
import cc.antx.template.vo.RoleVO;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 管理后台角色管理接口（仅管理员可访问）。
 *
 * <p>角色是子应用本地的角色字典，内置 {@code ADMIN} / {@code USER}，可新增自定义角色。
 * 用户表 {@code users.role} 引用这里的 {@code code}。</p>
 */
@Validated
@RestController
@RequestMapping("/api/admin/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;
    private final CurrentUserService currentUserService;

    /** 角色列表（默认只返回启用角色，includeDisabled=true 返回全部） */
    @GetMapping
    public Result<List<RoleVO>> list(Authentication authentication,
                                     @RequestParam(defaultValue = "false") boolean includeDisabled) {
        currentUserService.requireAdmin(authentication);
        return Result.success(roleService.listRoles(includeDisabled));
    }

    /** 新增角色 */
    @PostMapping
    public Result<RoleVO> create(Authentication authentication, @Valid @RequestBody RoleDTO dto) {
        currentUserService.requireAdmin(authentication);
        return Result.success(roleService.createRole(dto));
    }

    /** 更新角色（内置角色编码不可改） */
    @PutMapping("/{id}")
    public Result<RoleVO> update(Authentication authentication,
                                 @PathVariable Long id,
                                 @Valid @RequestBody RoleDTO dto) {
        currentUserService.requireAdmin(authentication);
        return Result.success(roleService.updateRole(id, dto));
    }

    /** 删除角色（内置角色、仍被用户使用的角色不可删） */
    @DeleteMapping("/{id}")
    public Result<Void> delete(Authentication authentication, @PathVariable Long id) {
        currentUserService.requireAdmin(authentication);
        roleService.deleteRole(id);
        return Result.success();
    }
}
