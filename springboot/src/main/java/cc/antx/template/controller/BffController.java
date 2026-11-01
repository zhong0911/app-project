package cc.antx.template.controller;

import cc.antx.template.common.result.Result;
import cc.antx.template.entity.User;
import cc.antx.template.service.UserService;
import cc.antx.template.vo.BffUserVO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * BFF（Backend For Frontend）面向前端的聚合接口。
 *
 * <p><b>设计目的：</b>前端只需调一个端点即可拿到"当前登录用户 + 子应用角色"，
 * 不用理解 OAuth2 / JWT claims 等内部细节；同时裁剪掉 token 的敏感 claims，避免暴露给前端。</p>
 *
 * <p>适用：多前端（Web / App / 小程序）各自有聚合层；此处给出单模块示例——聚合 SSO 身份与本地角色。</p>
 */
@RestController
@RequestMapping("/api/bff")
@RequiredArgsConstructor
public class BffController {

    private final UserService userService;

    /**
     * 聚合登录态：SSO 身份（uid / name）+ 子应用角色（本地表），前端友好出参。
     */
    @GetMapping("/me")
    public Result<BffUserVO> me(Authentication authentication) {
        BffUserVO vo = new BffUserVO();
        if (authentication == null) {
            return Result.success(vo);
        }

        String uid = null;
        String name = null;

        // 场景一：SSO 浏览器登录（OAuth2 Client）
        if (authentication instanceof OAuth2AuthenticationToken token) {
            OAuth2User oauth2User = token.getPrincipal();
            vo.setAuthType("sso-login");
            name = oauth2User.getName();
            Object sub = oauth2User.getAttributes().get("sub");
            uid = sub != null ? String.valueOf(sub) : null;
        }
        // 场景二：SSO Bearer Token（资源服务器）
        else if (authentication instanceof JwtAuthenticationToken jwtToken) {
            Jwt jwt = jwtToken.getToken();
            vo.setAuthType("sso-jwt");
            uid = jwt.getSubject();
            String preferred = jwt.getClaimAsString("preferred_username");
            name = StringUtils.hasText(preferred) ? preferred : uid;
        }
        // 场景三：本地联调 httpBasic（内存用户）
        else {
            vo.setAuthType("basic");
            name = authentication.getName();
        }

        vo.setName(name);

        // 聚合本地角色（查本地表；未注册则无角色）
        if (StringUtils.hasText(uid)) {
            vo.setUid(uid);
            User user = userService.getByUid(uid);
            if (user != null) {
                vo.setLocalId(user.getId());
                vo.setRole(user.getRole());
            }
        }
        return Result.success(vo);
    }
}
