package cc.antx.template;

import cc.antx.template.common.enums.ResultCode;
import cc.antx.template.common.result.PageResult;
import cc.antx.template.common.result.Result;
import cc.antx.template.common.utils.JsonUtils;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 纯单元测试：不加载 Spring 上下文、不依赖数据库，验证统一响应结构与 JSON 工具。
 *
 * <p>集成测试（需本地 MySQL）可参考：{@code @SpringBootTest} + 先执行 init.sql。</p>
 */
class TemplateApplicationTests {

    /** 验证统一响应五字段（code/success/message/data/timestamp） */
    @Test
    void resultShouldContainFiveFields() {
        Result<String> success = Result.success("hello");
        assertEquals(200, success.getCode());
        assertTrue(success.isSuccess());
        assertEquals(ResultCode.SUCCESS.getMessage(), success.getMessage());
        assertEquals("hello", success.getData());
        assertTrue(success.getTimestamp() > 0);

        // 序列化为 JSON 后包含五字段
        String json = JsonUtils.toJsonString(success);
        assertTrue(json.contains("\"code\""));
        assertTrue(json.contains("\"success\""));
        assertTrue(json.contains("\"message\""));
        assertTrue(json.contains("\"data\""));
        assertTrue(json.contains("\"timestamp\""));
    }

    /** 验证失败响应 */
    @Test
    void errorResultShouldBeFalse() {
        Result<Void> error = Result.error(ResultCode.BAD_REQUEST, "参数错误");
        assertEquals(400, error.getCode());
        assertFalse(error.isSuccess());
        assertEquals("参数错误", error.getMessage());
    }

    /** 验证分页封装 */
    @Test
    void pageResultShouldComputePages() {
        PageResult<String> page = new PageResult<>(1, 10, 23, List.of("a", "b"));
        assertEquals(1, page.getPageNum());
        assertEquals(10, page.getPageSize());
        assertEquals(23, page.getTotal());
        assertEquals(3, page.getPages());
        assertEquals(2, page.getRecords().size());
    }
}
