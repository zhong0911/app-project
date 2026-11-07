package cc.antx.template.common.utils;

import java.net.URI;
import java.util.List;
import java.util.Locale;

/**
 * 登录回跳地址校验（防开放重定向）。
 *
 * <p>SSO 回调成功后要把浏览器带回前端页面，回跳地址由前端访问 /sso/authorize 时以
 * {@code redirect_uri} 查询参数透传（同步存会话，回调时消费）。该地址来自请求参数，
 * 必须校验，否则就是一个任意跳转的口子：</p>
 * <ul>
 *   <li><b>站内相对路径</b>（以单个 {@code /} 开头，如 {@code /admin/users?tab=1}）：直接放行。
 *       浏览器按当前页面源解析，开发环境（前端 3000 代理 /sso）与生产（同域反向代理）都能回到前端；</li>
 *   <li><b>绝对 http(s) 地址</b>：仅当 origin（scheme://host:port）命中来源白名单
 *       （CORS 允许来源 + 默认成功页同源）时放行，用于前端与后端不同域的部署。</li>
 * </ul>
 * <p>协议相对（{@code //evil.com}）、反斜杠变体（{@code /\evil.com}）、控制字符、超长地址
 * 一律判为非法：返回 {@code null}，由调用方回退到默认成功页。</p>
 */
public final class RedirectUriUtils {

    /** 回跳地址最大长度（浏览器与各类代理的兼容上限） */
    private static final int MAX_LENGTH = 2048;

    private RedirectUriUtils() {
    }

    /**
     * 校验并返回安全的回跳地址。
     *
     * @param raw            前端透传的原始地址（可为 null）
     * @param allowedOrigins 绝对地址允许的来源列表（如 http://localhost:3000）
     * @return 通过校验的地址；不合法返回 {@code null}
     */
    public static String sanitize(String raw, List<String> allowedOrigins) {
        if (raw == null) {
            return null;
        }
        String target = raw.trim();
        if (target.isEmpty() || target.length() > MAX_LENGTH) {
            return null;
        }
        // 控制字符（含换行）会污染响应头
        for (int i = 0; i < target.length(); i++) {
            char ch = target.charAt(i);
            if (ch < 0x20 || ch == 0x7f) {
                return null;
            }
        }
        // 站内相对路径：只接受单个 / 开头
        if (target.startsWith("/")) {
            if (target.startsWith("//") || target.startsWith("/\\")) {
                return null;
            }
            return target;
        }
        // 绝对地址：只接受 http(s) 且 origin 命中白名单
        if (!target.startsWith("http://") && !target.startsWith("https://")) {
            return null;
        }
        String origin = originOf(target);
        if (origin == null || allowedOrigins == null) {
            return null;
        }
        for (String allowed : allowedOrigins) {
            if (allowed == null || allowed.isBlank()) {
                continue;
            }
            if (origin.equals(originOf(allowed.trim()))) {
                return target;
            }
        }
        return null;
    }

    /** 提取 origin（scheme://host[:port]，默认端口省略）；非法地址返回 null */
    private static String originOf(String url) {
        URI uri;
        try {
            uri = URI.create(url);
        } catch (IllegalArgumentException e) {
            return null;
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
        if (!"http".equals(scheme) && !"https".equals(scheme)) {
            return null;
        }
        if (host.isEmpty()) {
            return null;
        }
        int port = uri.getPort();
        boolean defaultPort = ("http".equals(scheme) && (port == -1 || port == 80))
                || ("https".equals(scheme) && (port == -1 || port == 443));
        return defaultPort ? scheme + "://" + host : scheme + "://" + host + ":" + port;
    }
}
