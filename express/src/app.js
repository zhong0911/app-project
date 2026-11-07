/**
 * Express 应用装配（对标 Spring Boot 的自动配置：中间件 + 路由 + 异常）。
 */
import express from 'express';
import session from 'express-session';
import routes from './routes/index.js';
import { config } from './config/index.js';
import { attachPrincipal } from './middlewares/auth.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 会话：SSO token 存服务端会话，前端只拿 Cookie
app.use(
  session({
    name: config.session.name,
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: config.session.maxAge },
  }),
);

// CORS：允许携带 Cookie 的来源（生产必须写具体域名，不能 *）
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && config.cors.origins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// 身份解析（不抛异常，未登录为匿名）
app.use((req, res, next) => {
  attachPrincipal(req, res, next);
});

app.get('/health', (req, res) => res.json({ status: 'UP' }));

app.use(routes);

// 异常兜底
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
