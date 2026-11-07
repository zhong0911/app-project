package cc.antx.template.mapper;

import cc.antx.template.entity.Role;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * 角色 Mapper。
 *
 * <p>角色表无逻辑删除，继承 {@link BaseMapper} 即可满足全部操作。</p>
 */
@Mapper
public interface RoleMapper extends BaseMapper<Role> {
}
