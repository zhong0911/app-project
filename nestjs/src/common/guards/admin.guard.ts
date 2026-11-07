/**
 * 管理员守卫（对标 Spring Boot 的 CurrentUserService#requireAdmin）。
 * 未登录 401，非管理员 403，被禁用 403。
 */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../modules/user/user.service';
import { BusinessException } from '../exceptions/business.exception';
import { Principal } from '../principal';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const principal: Principal = context.switchToHttp().getRequest().principal;
    if (!principal?.uid) throw BusinessException.unauthorized();
    if (String(principal.uid) !== String(this.config.get<string>('sso.adminUid'))) {
      throw BusinessException.forbidden('仅管理员可访问');
    }
    const local = await this.userService.getByUid(principal.uid);
    if (local && local.status === 0) throw BusinessException.forbidden('账号已被禁用');
    return true;
  }
}
