package cc.antx.template.service.impl;

import cc.antx.template.common.enums.ResultCode;
import cc.antx.template.common.exception.BusinessException;
import cc.antx.template.dto.RoleDTO;
import cc.antx.template.entity.Role;
import cc.antx.template.entity.User;
import cc.antx.template.mapper.RoleMapper;
import cc.antx.template.mapper.UserMapper;
import cc.antx.template.service.RoleService;
import cc.antx.template.vo.RoleVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;

/**
 * 角色服务实现。
 *
 * <p>角色编码统一存大写；内置角色（{@code built_in=1}）不可删除、不可改编码。</p>
 */
@Service
public class RoleServiceImpl extends ServiceImpl<RoleMapper, Role> implements RoleService {

    private final UserMapper userMapper;

    public RoleServiceImpl(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    @Override
    public List<RoleVO> listRoles(boolean includeDisabled) {
        LambdaQueryWrapper<Role> wrapper = new LambdaQueryWrapper<Role>()
                .eq(!includeDisabled, Role::getStatus, 1)
                .orderByAsc(Role::getSort)
                .orderByAsc(Role::getId);
        return this.list(wrapper).stream().map(this::toVO).toList();
    }

    @Override
    public RoleVO createRole(RoleDTO dto) {
        String code = normalizeCode(dto.getCode());
        if (getByCode(code) != null) {
            throw new BusinessException(ResultCode.DATA_CONFLICT, "角色编码已存在: " + code);
        }
        Role role = new Role();
        BeanUtils.copyProperties(dto, role);
        role.setCode(code);
        role.setBuiltIn(0);
        role.setStatus(dto.getStatus() == null ? 1 : dto.getStatus());
        role.setSort(dto.getSort() == null ? 0 : dto.getSort());
        this.save(role);
        return toVO(role);
    }

    @Override
    public RoleVO updateRole(Long id, RoleDTO dto) {
        Role role = this.getById(id);
        if (role == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "角色不存在: " + id);
        }
        String code = normalizeCode(dto.getCode());
        // 内置角色编码固定，避免改坏已有用户的角色关联
        if (Integer.valueOf(1).equals(role.getBuiltIn()) && !role.getCode().equals(code)) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "内置角色编码不可修改: " + role.getCode());
        }
        if (!role.getCode().equals(code)) {
            Role sameCode = getByCode(code);
            if (sameCode != null) {
                throw new BusinessException(ResultCode.DATA_CONFLICT, "角色编码已存在: " + code);
            }
        }
        role.setCode(code);
        role.setName(dto.getName());
        role.setDescription(dto.getDescription());
        role.setStatus(dto.getStatus() == null ? role.getStatus() : dto.getStatus());
        role.setSort(dto.getSort() == null ? role.getSort() : dto.getSort());
        this.updateById(role);
        return toVO(role);
    }

    @Override
    public void deleteRole(Long id) {
        Role role = this.getById(id);
        if (role == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "角色不存在: " + id);
        }
        if (Integer.valueOf(1).equals(role.getBuiltIn())) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "内置角色不可删除: " + role.getCode());
        }
        // 仍被用户占用时不允许删除，避免留下无角色的用户
        Long used = userMapper.selectCount(new LambdaQueryWrapper<User>().eq(User::getRole, role.getCode()));
        if (used != null && used > 0) {
            throw new BusinessException(ResultCode.DATA_CONFLICT,
                    "仍有 " + used + " 个用户使用该角色，请先调整用户角色: " + role.getCode());
        }
        this.removeById(id);
    }

    @Override
    public Role getByCode(String code) {
        if (!StringUtils.hasText(code)) {
            return null;
        }
        return this.getOne(new LambdaQueryWrapper<Role>()
                .eq(Role::getCode, normalizeCode(code))
                .last("LIMIT 1"));
    }

    @Override
    public boolean isAssignable(String code) {
        Role role = getByCode(code);
        return role != null && Integer.valueOf(1).equals(role.getStatus());
    }

    /** 角色编码归一化：去空格并转大写 */
    private String normalizeCode(String code) {
        return StringUtils.hasText(code) ? code.trim().toUpperCase(Locale.ROOT) : code;
    }

    /** 实体转 VO */
    private RoleVO toVO(Role role) {
        RoleVO vo = new RoleVO();
        BeanUtils.copyProperties(role, vo);
        return vo;
    }
}
