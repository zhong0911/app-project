/**
 * Express 类型扩展：会话字段 + 当前登录身份。
 */
import 'express-session';
import { Principal } from '../common/principal';

declare module 'express-session' {
  interface SessionData {
    uid?: string;
    name?: string;
    ssoState?: string;
    accessToken?: string;
    refreshToken?: string;
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}
