/**
 * SSO 客户端服务（对标 Spring Boot 的 OAuth2 Client）。
 * 授权码登录 + token 换取 + revoke。
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class SsoService {
  constructor(private readonly config: ConfigService) {}

  /** 生成 state（防 CSRF，存会话后回调校验） */
  newState(): string {
    return randomBytes(24).toString('base64url');
  }

  /** 拼装授权跳转地址 */
  buildAuthorizeUrl(state: string): string {
    const url = new URL(this.config.get<string>('sso.authorizationUri')!);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.config.get<string>('sso.clientId')!);
    url.searchParams.set('redirect_uri', this.config.get<string>('sso.redirectUri')!);
    url.searchParams.set('scope', this.config.get<string>('sso.scope')!);
    url.searchParams.set('state', state);
    return url.toString();
  }

  /** 用授权码换 token（client_secret_post） */
  async exchangeCode(code: string): Promise<any> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.get<string>('sso.redirectUri')!,
      client_id: this.config.get<string>('sso.clientId')!,
      client_secret: this.config.get<string>('sso.clientSecret')!,
    });

    let response: Response;
    try {
      response = await fetch(this.config.get<string>('sso.tokenUri')!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(10000),
      });
    } catch (error: any) {
      throw BusinessException.unauthorized(`SSO 不可达: ${error?.message}`);
    }
    if (!response.ok) {
      throw BusinessException.unauthorized(`SSO 换取 token 失败: HTTP ${response.status}`);
    }
    return response.json();
  }

  /** 获取用户资料（sub 即用户 uid） */
  async fetchUserInfo(accessToken: string): Promise<any> {
    let response: Response;
    try {
      response = await fetch(this.config.get<string>('sso.userinfoUri')!, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10000),
      });
    } catch (error: any) {
      throw BusinessException.unauthorized(`SSO 不可达: ${error?.message}`);
    }
    if (!response.ok) {
      throw BusinessException.unauthorized(`获取 SSO 用户信息失败: HTTP ${response.status}`);
    }
    return response.json();
  }

  /** 撤销 token（RFC 7009）；失败只记日志，不阻塞退出 */
  async revokeToken(token?: string, hint = 'refresh_token'): Promise<boolean> {
    const revokeUri = this.config.get<string>('sso.revokeUri');
    if (!token || !revokeUri) return false;
    try {
      const body = new URLSearchParams({
        token,
        token_type_hint: hint,
        client_id: this.config.get<string>('sso.clientId')!,
        client_secret: this.config.get<string>('sso.clientSecret')!,
      });
      const response = await fetch(revokeUri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(10000),
      });
      return response.ok;
    } catch (error: any) {
      console.warn('[SSO] revoke 失败（忽略，不阻塞退出）:', error?.message);
      return false;
    }
  }
}
