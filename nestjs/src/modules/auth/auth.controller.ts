/**
 * 认证接口（对标 Spring Boot 的 controller/AuthController）。
 * GET /api/auth/me、POST /api/auth/logout
 */
import { Controller, Get, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Principal } from '../../common/principal';
import { Result, ResultBody } from '../../common/result/result';
import { SsoService } from '../sso/sso.service';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly ssoService: SsoService,
    private readonly config: ConfigService,
  ) {}

  @Get('me')
  me(@CurrentUser() principal: Principal): ResultBody<any> {
    if (!principal?.uid) return Result.success({});

    const data: any = { authenticated: true };
    if (principal.authType === 'sso-jwt') {
      data.type = 'sso-jwt';
      data.subject = principal.uid;
      data.claims = principal.claims;
    } else if (principal.authType === 'sso-login') {
      data.type = 'sso-login';
      data.clientRegistrationId = 'sso';
      data.name = principal.name;
      data.attributes = { sub: principal.uid, preferred_username: principal.name };
    } else {
      data.type = 'basic';
      data.name = principal.name;
    }
    return Result.success(data);
  }

  @Post('logout')
  async logout(@Req() req: Request): Promise<ResultBody<any>> {
    // 1) 优先撤销 refresh_token，没有则撤销 access_token
    const refreshToken = req.session?.refreshToken;
    const accessToken = req.session?.accessToken;
    if (refreshToken) await this.ssoService.revokeToken(refreshToken, 'refresh_token');
    else if (accessToken) await this.ssoService.revokeToken(accessToken, 'access_token');

    // 2) 销毁本地会话
    req.session?.destroy(() => undefined);

    // 3) 返回 SSO 登出地址（前端整页跳转完成全局退出）
    return Result.success({ ssoLogoutUrl: this.config.get<string>('sso.logoutUri') || null });
  }
}
