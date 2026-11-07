package cc.antx.template.controller;

import cc.antx.template.common.result.PageResult;
import cc.antx.template.common.result.Result;
import cc.antx.template.dto.UserCreateDTO;
import cc.antx.template.dto.UserQueryDTO;
import cc.antx.template.dto.UserUpdateDTO;
import cc.antx.template.service.UserService;
import cc.antx.template.vo.UserVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 用户接口（RESTful 示例）。
 *
 * <p>约束遵循团队规范：</p>
 * <ul>
 *   <li>统一返回 {@link Result} 五字段响应</li>
 *   <li>入参使用 DTO，出参使用 VO</li>
 *   <li>含长文本/结构化入参的 POST/PUT 一律使用 JSON body（@RequestBody）</li>
 * </ul>
 */
@Validated
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /** 创建用户（POST + JSON body） */
    @PostMapping
    public Result<UserVO> create(@Valid @RequestBody UserCreateDTO dto) {
        return Result.success(userService.createUser(dto));
    }

    /** 更新用户（PUT + JSON body） */
    @PutMapping
    public Result<UserVO> update(@Valid @RequestBody UserUpdateDTO dto) {
        return Result.success(userService.updateUser(dto));
    }

    /** 删除用户（逻辑删除） */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        userService.deleteUser(id);
        return Result.success();
    }

    /** 查询用户详情 */
    @GetMapping("/{id}")
    public Result<UserVO> detail(@PathVariable Long id) {
        return Result.success(userService.getUserById(id));
    }

    /** 分页查询用户列表 */
    @GetMapping
    public Result<PageResult<UserVO>> page(@Valid UserQueryDTO dto) {
        return Result.success(PageResult.of(userService.pageQuery(dto)));
    }
}
