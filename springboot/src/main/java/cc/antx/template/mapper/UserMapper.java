package cc.antx.template.mapper;

import cc.antx.template.entity.User;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * 用户 Mapper。
 *
 * <p>继承 {@link BaseMapper} 即拥有增删改查能力；回收站/物理删除等需要绕开
 * {@code @TableLogic} 的 SQL 在 {@code UserMapper.xml} 中实现。</p>
 */
@Mapper
public interface UserMapper extends BaseMapper<User> {

    /** 分页查询（包含回收站数据，deleted=0 为正常列表，deleted=1 为回收站） */
    IPage<User> selectPageIncludingDeleted(Page<User> page,
                                           @Param("uid") String uid,
                                           @Param("status") Integer status,
                                           @Param("deleted") int deleted);

    /** 按 uid 查询（包含已软删除记录，用于唯一性校验） */
    User selectByUidIncludingDeleted(@Param("uid") String uid);

    /** 按主键查询（包含已软删除记录，用于回收站） */
    User selectByIdIncludingDeleted(@Param("id") Long id);

    /** 更新启停状态（包含回收站记录） */
    int updateStatusById(@Param("id") Long id, @Param("status") Integer status);

    /** 登录成功时刷新上次登录时间（按 uid） */
    int updateLastLoginAtByUid(@Param("uid") String uid);

    /** 软删除：移入回收站 */
    int softDeleteById(@Param("id") Long id);

    /** 从回收站恢复 */
    int restoreById(@Param("id") Long id);

    /** 物理删除（清空回收站中的单条记录） */
    int purgeById(@Param("id") Long id);
}
