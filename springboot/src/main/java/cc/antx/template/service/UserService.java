package cc.antx.template.service;

import cc.antx.template.dto.UserCreateDTO;
import cc.antx.template.dto.UserQueryDTO;
import cc.antx.template.dto.UserUpdateDTO;
import cc.antx.template.entity.User;
import cc.antx.template.vo.UserVO;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.IService;

/**
 * 用户服务接口。
 *
 * <p>接口只暴露业务语义方法，不暴露实体细节给上层；入参 DTO、出参 VO。</p>
 */
public interface UserService extends IService<User> {

    /** 创建用户（入参 DTO） */
    UserVO createUser(UserCreateDTO dto);

    /** 更新用户（入参 DTO） */
    UserVO updateUser(UserUpdateDTO dto);

    /** 删除用户（逻辑删除） */
    void deleteUser(Long id);

    /** 查询用户详情（出参 VO） */
    UserVO getUserById(Long id);

    /** 分页查询（出参 VO 分页） */
    IPage<UserVO> pageQuery(UserQueryDTO dto);

    /** 分页查询回收站（逻辑删除）用户 */
    IPage<UserVO> pageRecycle(UserQueryDTO dto);

    /** 设置用户启停状态：1-启用，0-禁用 */
    UserVO updateStatus(Long id, Integer status);

    /** 从回收站恢复用户 */
    UserVO restore(Long id);

    /** 物理删除回收站中的用户 */
    void purge(Long id);

    /**
     * 按 SSO 用户 uid（access_token 的 sub）查询本地用户。
     *
     * <p>方案A：角色本地化。token 取 sub(=uid) → 查本地表 → 拿角色（ADMIN/USER）。</p>
     *
     * @param uid SSO 用户 uid
     * @return 本地用户实体，未找到返回 null
     */
    User getByUid(String uid);

    /**
     * 按 uid 查询，本地表无记录时自动注册一条默认 USER 记录。
     *
     * <p>新登录用户默认普通用户（USER）；管理员通过初始数据/更新接口单独设为 ADMIN。</p>
     *
     * @param uid SSO 用户 uid
     * @return 本地用户实体（可能刚自动创建）
     */
    User getOrCreateDefaultUser(String uid);
}
