package cc.antx.template.common.utils;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.TypeReference;

import java.util.List;

/**
 * JSON 工具类（基于 fastjson2）。
 *
 * <p>用于业务内对象的序列化 / 反序列化。HTTP 层统一响应由 Spring 默认序列化器负责，
 * 此工具仅作为业务侧的 JSON 能力补充。</p>
 */
public final class JsonUtils {

    private JsonUtils() {
    }

    /** 对象转 JSON 字符串 */
    public static String toJsonString(Object obj) {
        return JSON.toJSONString(obj);
    }

    /** JSON 字符串转对象 */
    public static <T> T parseObject(String json, Class<T> clazz) {
        return JSON.parseObject(json, clazz);
    }

    /** JSON 字符串转对象（泛型复杂类型，如 Map<String, Object>） */
    public static <T> T parseObject(String json, TypeReference<T> typeReference) {
        return JSON.parseObject(json, typeReference);
    }

    /** JSON 字符串转列表 */
    public static <T> List<T> parseArray(String json, Class<T> clazz) {
        return JSON.parseArray(json, clazz);
    }
}
