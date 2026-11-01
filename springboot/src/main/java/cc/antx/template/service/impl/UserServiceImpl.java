package cc.antx.template.service.impl;

import cc.antx.template.common.enums.ResultCode;
import cc.antx.template.common.exception.BusinessException;
import cc.antx.template.dto.UserCreateDTO;
import cc.antx.template.dto.UserQueryDTO;
import cc.antx.template.dto.UserUpdateDTO;
import cc.antx.template.entity.User;
import cc.antx.template.mapper.UserMapper;
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

/**
 * 用户服务实现。
 *
 * <p>体现 DTO（入参）→ 实体 → VO（出参）的转换链路。</p>
 */
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    @Override
    public UserVO createUser(UserCreateDTO dto) {
        // 业务校验：SSO 用户 uid 唯一
        long count = this.count(new LambdaQueryWrapper<User>().eq(User::getUid, dto.getUid()));
        if (count > 0) {
            throw new BusinessException(ResultCode.DATA_CONFLICT, "SSO 用户已存在: " + dto.getUid());
        }

        User user = new User();
        BeanUtils.copyProperties(dto, user);
        // 逻辑删除、乐观锁、默认角色（新用户默认 USER）
        user.setDeleted(0);
        user.setVersion(1);
        user.setRole("USER");
        this.save(user);

        return toVO(user);
    }

    @Override
    public UserVO updateUser(UserUpdateDTO dto) {
        User user = this.getById(dto.getId());
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在: " + dto.getId());
        }
        // 角色白名单校验：仅允许 ADMIN / USER
        if (!"ADMIN".equalsIgnoreCase(dto.getRole()) && !"USER".equalsIgnoreCase(dto.getRole())) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "角色不合法，仅支持 ADMIN / USER: " + dto.getRole());
        }
        user.setRole(dto.getRole().toUpperCase());
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
                .orderByDesc(User::getCreateTime);

        IPage<User> page = this.page(new Page<>(dto.getPageNum(), dto.getPageSize()), wrapper);

        // 实体分页 -> VO 分页
        return page.convert(this::toVO);
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
