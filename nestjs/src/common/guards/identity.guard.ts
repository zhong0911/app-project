/**
 * 身份解析守卫（对标 Spring Boot 的 Security 过滤器链）。
 * 每次请求解析出 Principal 挂到 request.principal，本身不拦截。
 */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from '../exceptions/business.exception';
import { verifyBearerToken } from '../jwt-verifier';
import { ANONYMOUS, Principal } from '../principal';

@Injectable()
export class IdentityGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    request.principal = await this.resolve(request);
    return true;
  }

  private async resolve(request: any): Promise<Principal> {
    // 1) SSO 浏览器登录：会话里存了 uid
    if (request.session?.uid) {
      return {
        uid: String(request.session.uid),
        name: request.session.name ?? null,
        authType: 'sso-login',
        claims: {},
      };
    }

    const authorization: string = request.headers?.authorization ?? '';

    // 2) Bearer Token
    if (authorization.toLowerCase().startsWith('bearer ')) {
      const claims = await verifyBearerToken(
        authorization.slice(7).trim(),
        this.config.get<string>('sso.jwksUri')!,
        this.config.get<string>('sso.issuer')!,
      );
      const uid = claims.sub !== undefined ? String(claims.sub) : null;
      return {
        uid,
        name: claims.preferred_username ?? claims.name ?? uid,
        authType: 'sso-jwt',
        claims,
      };
    }

    // 3) 本地联调 Basic
    if (authorization.toLowerCase().startsWith('basic ')) {
      if (!this.config.get<boolean>('security.basicEnabled')) {
        throw BusinessException.unauthorized();
      }
      let decoded = '';
      try {
        decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
      } catch {
        throw BusinessException.unauthorized();
      }
      const [username, password] = decoded.split(':');
      if (
        username !== this.config.get<string>('security.adminUsername') ||
        password !== this.config.get<string>('security.adminPassword')
      ) {
        throw BusinessException.unauthorized();
      }
      return { uid: username, name: username, authType: 'basic', claims: {} };
    }

    return { ...ANONYMOUS };
  }
}
