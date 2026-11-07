/**
 * SSO 登录入口（对标 Spring Boot 的 controller/OAuth2LoginController）。
 * 路径全后端统一：GET /sso/authorize、GET /sso/callback
 */
import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { BusinessException } from '../../common/exceptions/business.exception';
import { UserService } from '../user/user.service';
import { SsoService } from './sso.service';

@Controller('sso')
export class SsoController {
  constructor(
    private readonly ssoService: SsoService,
    private readonly userService: UserService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 302 跳 SSO 登录页（带 state，存会话供回调校验）。
   * 可带 ?redirect_uri=<前端回跳地址>（站内路径或白名单内的绝对地址）：校验后存会话，回调成功后直接跳过去。
   */
  @Get('authorize')
  authorize(@Req() req: Request, @Res() res: Response, @Query('redirect_uri') redirectUri?: string) {
    const state = this.ssoService.newState();
    req.session.ssoState = state;
    // 回跳地址与 state 同会话保存，回调成功时消费一次
    const target = this.ssoService.sanitizeRedirectUri(redirectUri);
    if (target) {
      req.session.ssoRedirectUri = target;
    } else {
      delete req.session.ssoRedirectUri;
    }
    return res.redirect(302, this.ssoService.buildAuthorizeUrl(state));
  }

  /** 回调：换 token → 取用户信息 → 写会话 → 注册默认用户 → 跳成功页 */
  @Get('callback')
  async callback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    const expected = req.session.ssoState;
    delete req.session.ssoState;
    if (!code || !expected || state !== expected) {
      throw BusinessException.badRequest('state 校验失败，请重新登录');
    }

    const token = await this.ssoService.exchangeCode(code);
    if (!token.access_token) throw BusinessException.unauthorized('SSO 未返回 access_token');

    const userInfo = await this.ssoService.fetchUserInfo(token.access_token);
    if (userInfo.sub === undefined) throw BusinessException.unauthorized('SSO 未返回用户标识 sub');

    // 身份 + token 全部留在服务端会话；前端只拿到会话 Cookie
    req.session.uid = String(userInfo.sub);
    req.session.name = userInfo.preferred_username ?? userInfo.name ?? String(userInfo.sub);
    req.session.accessToken = token.access_token;
    req.session.refreshToken = token.refresh_token;

    await this.userService.getOrCreateDefaultUser(String(userInfo.sub));

    // 优先跳前端透传的回跳地址（已在 /sso/authorize 校验过），否则用配置的兜底地址
    const redirectUri = req.session.ssoRedirectUri;
    delete req.session.ssoRedirectUri;
    return res.redirect(302, redirectUri || this.config.get<string>('sso.loginSuccessUrl')!);
  }
}
