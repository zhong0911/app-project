/**
 * SSO 模块（登录入口 + 客户端服务）。
 */
import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { SsoController } from './sso.controller';
import { SsoService } from './sso.service';

@Module({
  imports: [UserModule],
  controllers: [SsoController],
  providers: [SsoService],
  exports: [SsoService],
})
export class SsoModule {}
