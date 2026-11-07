/**
 * 用户模块（对标 Spring 的 @Service 扫描范围）。
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserRepository, UserService],
  controllers: [UserController],
  exports: [UserService, UserRepository],
})
export class UserModule {}
