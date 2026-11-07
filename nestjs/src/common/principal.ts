/**
 * 当前登录身份（对标 Spring Boot 的 Authentication 对象）。
 */
export type AuthType = 'sso-login' | 'sso-jwt' | 'basic' | 'anonymous';

export interface Principal {
  uid: string | null;
  name: string | null;
  authType: AuthType;
  claims: Record<string, any>;
}

export const ANONYMOUS: Principal = { uid: null, name: null, authType: 'anonymous', claims: {} };
