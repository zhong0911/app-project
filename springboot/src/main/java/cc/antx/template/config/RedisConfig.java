package cc.antx.template.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Redis 配置。
 *
 * <p><b>序列化约定：</b>key 与 value 均使用 String，value 建议用 fastjson2 的
 * {@code JsonUtils.toJsonString()} 序列化为 JSON 字符串后存储，读取时用
 * {@code JsonUtils.parseObject()} 还原，避免 Jackson 2/3 版本兼容问题。</p>
 *
 * <p>使用：注入 {@code RedisTemplate<String, String>}（value 为 JSON 字符串）或
 * {@code StringRedisTemplate}（string 值）。</p>
 */
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, String> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        StringRedisSerializer serializer = new StringRedisSerializer();
        template.setKeySerializer(serializer);
        template.setValueSerializer(serializer);
        template.setHashKeySerializer(serializer);
        template.setHashValueSerializer(serializer);

        template.afterPropertiesSet();
        return template;
    }
}
