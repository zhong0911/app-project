/**
 * BFF 模块。
 */
import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { BffController } from './bff.controller';

@Module({
  imports: [UserModule],
  controllers: [BffController],
})
export class BffModule {}
