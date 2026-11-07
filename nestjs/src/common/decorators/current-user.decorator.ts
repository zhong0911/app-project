/**
 * 取当前登录身份的装饰器（对标 Spring 的 Authentication 方法参数）。
 * 用法：`me(@CurrentUser() principal: Principal) {}`
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Principal } from '../principal';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Principal =>
    context.switchToHttp().getRequest().principal,
);
