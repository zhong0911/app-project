package cc.antx.template.service;

import cc.antx.template.dto.RoleDTO;
import cc.antx.template.entity.Role;
import cc.antx.template.vo.RoleVO;
import com.baomidou.mybatisplus.spring.service.IService;

import java.util.List;

/**
 * 角色服务接口。
 *
 * <p>子应用本地角色字典：内置 ADMIN / USER，支持管理员新增自定义角色。
 * 用户表 {@code role} 存的就是这里的 {@code code}。</p>
 */
public interface RoleService extends IService<Role> {

    /** 角色列表（按 sort 升序；includeDisabled=false 时只返回启用角色） */
    List<RoleVO> listRoles(boolean includeDisabled);

    /** 新增角色 */
    RoleVO createRole(RoleDTO dto);

    /** 更新角色（内置角色不允许改编码） */
    RoleVO updateRole(Long id, RoleDTO dto);

    /** 删除角色（内置角色、仍有用户使用的角色不允许删除） */
    void deleteRole(Long id);

    /** 按编码查询角色（不区分大小写，不存在返回 null） */
    Role getByCode(String code);

    /** 角色编码是否可用（存在且启用） */
    boolean isAssignable(String code);
}
