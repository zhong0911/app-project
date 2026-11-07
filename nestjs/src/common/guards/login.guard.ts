/**
 * 登录守卫（对标 Spring 的 anyRequest().authenticated()）。
 */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { BusinessException } from '../exceptions/business.exception';

@Injectable()
export class LoginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const principal = context.switchToHttp().getRequest().principal;
    if (!principal?.uid) throw BusinessException.unauthorized();
    return true;
  }
}
