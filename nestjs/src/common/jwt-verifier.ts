/**
 * JWT 验证（对标 Spring Boot 资源服务器的 JWKS 验签）。
 * 用 jose 从 SSO 的 JWKS 端点拉公钥，校验签名 + issuer。
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { BusinessException } from './exceptions/business.exception';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(jwksUri: string) {
  if (!jwks) jwks = createRemoteJWKSet(new URL(jwksUri));
  return jwks;
}

export async function verifyBearerToken(
  token: string,
  jwksUri: string,
  issuer: string,
): Promise<Record<string, any>> {
  try {
    const { payload } = await jwtVerify(token, getJwks(jwksUri), { issuer });
    return payload as Record<string, any>;
  } catch (error: any) {
    throw BusinessException.unauthorized(`令牌无效: ${error?.message}`);
  }
}
