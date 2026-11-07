package cc.antx.template.service.impl;

import cc.antx.template.common.enums.ResultCode;
import cc.antx.template.common.exception.BusinessException;
import cc.antx.template.dto.UserCreateDTO;
import cc.antx.template.dto.UserQueryDTO;
import cc.antx.template.dto.UserUpdateDTO;
import cc.antx.template.entity.User;
import cc.antx.template.mapper.UserMapper;
import cc.antx.template.service.RoleService;
import cc.antx.template.service.UserService;
import cc.antx.template.vo.UserVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import org.springframework.beans.BeanUtils;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Locale;

/**
 * 用户服务实现。
 *
 * <p>体现 DTO（入参）→ 实体 → VO（出参）的转换链路。</p>
 */
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    private final RoleService roleService;

    public UserServiceImpl(RoleService roleService) {
        this.roleService = roleService;
    }

    @Override
    public UserVO createUser(UserCreateDTO dto) {
        // 业务校验：SSO 用户 uid 唯一（包含回收站记录，避免软删除后重复创建）
        User exists = baseMapper.selectByUidIncludingDeleted(dto.getUid());
        if (exists != null) {
            if (Integer.valueOf(1).equals(exists.getDeleted())) {
                throw new BusinessException(ResultCode.DATA_CONFLICT,
                        "该 uid 已在回收站，请先恢复: " + dto.getUid());
            }
            throw new BusinessException(ResultCode.DATA_CONFLICT, "SSO 用户已存在: " + dto.getUid());
        }

        User user = new User();
        BeanUtils.copyProperties(dto, user);
        // 逻辑删除、启停、乐观锁、默认角色（新用户默认 USER）
        user.setDeleted(0);
        user.setStatus(1);
        user.setVersion(1);
        user.setRole("USER");
        this.save(user);

        return toVO(user);
    }

    @Override
    public UserVO updateUser(UserUpdateDTO dto) {
        if (dto.getId() == null) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "用户 ID 不能为空");
        }
        User user = this.getById(dto.getId());
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在: " + dto.getId());
        }
        // 角色校验：必须存在于角色表中且为启用状态（角色表内置 ADMIN / USER，可自定义扩展）
        if (!roleService.isAssignable(dto.getRole())) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "角色不存在或已禁用: " + dto.getRole());
        }
        user.setRole(dto.getRole().trim().toUpperCase(Locale.ROOT));
        // 携带 @Version 字段，update 时自动校验乐观锁
        this.updateById(user);
        return toVO(user);
    }

    @Override
    public void deleteUser(Long id) {
        User user = this.getById(id);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在: " + id);
        }
        // 逻辑删除（@TableLogic 自动拼接 deleted = 1）
        this.removeById(id);
    }

    @Override
    public UserVO getUserById(Long id) {
        User user = this.getById(id);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在: " + id);
        }
        return toVO(user);
    }

    @Override
    public IPage<UserVO> pageQuery(UserQueryDTO dto) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<User>()
                .eq(StringUtils.hasText(dto.getUid()), User::getUid, dto.getUid())
                .eq(StringUtils.hasText(dto.getRole()), User::getRole, dto.getRole())
                .eq(dto.getStatus() != null, User::getStatus, dto.getStatus())
                .orderByDesc(User::getCreateTime);

        IPage<User> page = this.page(new Page<>(dto.getPageNum(), dto.getPageSize()), wrapper);

        // 实体分页 -> VO 分页
        return page.convert(this::toVO);
    }

    @Override
    public IPage<UserVO> pageRecycle(UserQueryDTO dto) {
        Page<User> page = new Page<>(dto.getPageNum(), dto.getPageSize());
        return baseMapper.selectPageIncludingDeleted(page, dto.getUid(), dto.getStatus(), 1)
                .convert(this::toVO);
    }

    @Override
    public UserVO updateStatus(Long id, Integer status) {
        if (status == null || (status != 0 && status != 1)) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "状态仅支持 0-禁用 / 1-启用");
        }
        User user = baseMapper.selectById(id);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在: " + id);
        }
        baseMapper.updateStatusById(id, status);
        return toVO(this.getById(id));
    }

    @Override
    public UserVO restore(Long id) {
        User user = baseMapper.selectByIdIncludingDeleted(id);
        if (user == null || !Integer.valueOf(1).equals(user.getDeleted())) {
            throw new BusinessException(ResultCode.NOT_FOUND, "回收站中不存在该用户: " + id);
        }
        baseMapper.restoreById(id);
        return toVO(baseMapper.selectById(id));
    }

    @Override
    public void purge(Long id) {
        int rows = baseMapper.purgeById(id);
        if (rows == 0) {
            throw new BusinessException(ResultCode.NOT_FOUND, "回收站中不存在该用户: " + id);
        }
    }

    @Override
    public void touchLastLogin(String uid) {
        if (!StringUtils.hasText(uid)) {
            return;
        }
        // 本地无记录时先按默认 USER 自动注册（与首次登录约定一致）
        User user = getOrCreateDefaultUser(uid);
        if (user == null) {
            return;
        }
        baseMapper.updateLastLoginAtByUid(uid);
    }

    @Override
    public User getByUid(String uid) {
        if (!StringUtils.hasText(uid)) {
            return null;
        }
        return this.getOne(new LambdaQueryWrapper<User>()
                .eq(User::getUid, uid)
                .last("LIMIT 1"));
    }

    @Override
    public User getOrCreateDefaultUser(String uid) {
        if (!StringUtils.hasText(uid)) {
            return null;
        }
        User existing = getByUid(uid);
        if (existing != null) {
            return existing;
        }
        // 新登录用户默认注册为普通用户（USER）
        User user = new User();
        user.setUid(uid);
        user.setRole("USER");
        user.setStatus(1);
        user.setDeleted(0);
        user.setVersion(1);
        try {
            this.save(user);
        } catch (DuplicateKeyException e) {
            // 并发下已有记录，直接查回
            User again = getByUid(uid);
            if (again != null) {
                return again;
            }
            throw e;
        }
        return user;
    }

    /** 实体转 VO */
    private UserVO toVO(User user) {
        UserVO vo = new UserVO();
        BeanUtils.copyProperties(user, vo);
        return vo;
    }
}
