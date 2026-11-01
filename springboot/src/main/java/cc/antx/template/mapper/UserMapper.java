package cc.antx.template.mapper;

import cc.antx.template.entity.User;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * 用户 Mapper。
 *
 * <p>继承 {@link BaseMapper} 即拥有增删改查能力；复杂 SQL 可在此声明方法并配合
 * {@code src/main/resources/mapper/UserMapper.xml} 实现。</p>
 */
@Mapper
public interface UserMapper extends BaseMapper<User> {
}
