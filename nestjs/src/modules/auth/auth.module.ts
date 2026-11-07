/**
 * 认证模块。
 */
import { Module } from '@nestjs/common';
import { SsoModule } from '../sso/sso.module';
import { AuthController } from './auth.controller';

@Module({
  imports: [SsoModule],
  controllers: [AuthController],
})
export class AuthModule {}
