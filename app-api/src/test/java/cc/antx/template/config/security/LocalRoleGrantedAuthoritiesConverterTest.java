package cc.antx.template.config.security;

import cc.antx.template.entity.User;
import cc.antx.template.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Collection;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * {@link LocalRoleGrantedAuthoritiesConverter} 单测（方案B：token 取 sub(=uid) 查本地 t_user.role 注入 ROLE_*）。
 */
class LocalRoleGrantedAuthoritiesConverterTest {

    private Jwt jwtWithSubject(String sub) {
        return Jwt.withTokenValue("test-token")
                .header("alg", "none")
                .subject(sub)
                .build();
    }

    private User userWithRole(String uid, String role) {
        User user = new User();
        user.setId(1L);
        user.setUid(uid);
        user.setRole(role);
        return user;
    }

    @Test
    void admin_user_gets_role_admin() {
        UserService userService = mock(UserService.class);
        when(userService.getByUid("1001")).thenReturn(userWithRole("1001", "ADMIN"));
        LocalRoleGrantedAuthoritiesConverter converter = new LocalRoleGrantedAuthoritiesConverter(userService);

        Collection<GrantedAuthority> authorities = converter.convert(jwtWithSubject("1001"));

        assertEquals(List.of("ROLE_ADMIN"), authorities.stream().map(GrantedAuthority::getAuthority).toList());
    }

    @Test
    void normal_user_gets_role_user() {
        UserService userService = mock(UserService.class);
        when(userService.getByUid("1001")).thenReturn(userWithRole("1001", "USER"));
        LocalRoleGrantedAuthoritiesConverter converter = new LocalRoleGrantedAuthoritiesConverter(userService);

        Collection<GrantedAuthority> authorities = converter.convert(jwtWithSubject("1001"));

        assertEquals(List.of("ROLE_USER"), authorities.stream().map(GrantedAuthority::getAuthority).toList());
    }

    @Test
    void unregistered_user_gets_no_authority() {
        UserService userService = mock(UserService.class);
        // 本地表无该用户 → 无任何子应用角色（无权限）
        when(userService.getByUid("9999")).thenReturn(null);
        LocalRoleGrantedAuthoritiesConverter converter = new LocalRoleGrantedAuthoritiesConverter(userService);

        Collection<GrantedAuthority> authorities = converter.convert(jwtWithSubject("9999"));

        assertTrue(authorities.isEmpty());
    }

    @Test
    void missing_sub_gets_no_authority() {
        UserService userService = mock(UserService.class);
        LocalRoleGrantedAuthoritiesConverter converter = new LocalRoleGrantedAuthoritiesConverter(userService);

        // 无 sub（getSubject 返回 null），但需至少一个 claim 才能构造 Jwt
        Jwt jwt = Jwt.withTokenValue("test-token").header("alg", "none").claim("iss", "test-issuer").build();
        Collection<GrantedAuthority> authorities = converter.convert(jwt);

        assertTrue(authorities.isEmpty());
    }
}
