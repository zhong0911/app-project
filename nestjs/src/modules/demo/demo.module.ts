/**
 * 权限示例模块。
 */
import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { DemoController } from './demo.controller';

@Module({
  imports: [UserModule],
  controllers: [DemoController],
})
export class DemoModule {}
