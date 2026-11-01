package cc.antx.template.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * 验证 Spring Session 落 Redis：createSession → save → 用 findById 从 Redis 读回。
 * 若成功，Redis 中会出现 spring:session 相关的 key。
 */
@SpringBootTest
class RedisSessionConfigTest {

    @Autowired
    @SuppressWarnings("rawtypes")
    private SessionRepository sessionRepository;

    @Test
    void session_saved_to_and_loaded_from_redis() {
        @SuppressWarnings("unchecked")
        Session session = sessionRepository.createSession();
        session.setAttribute("testKey", "testValue");
        sessionRepository.save(session);

        Session loaded = (Session) sessionRepository.findById(session.getId());
        assertNotNull(loaded, "session 应从 Redis 读回");
        assertEquals("testValue", loaded.getAttribute("testKey"));
    }
}
