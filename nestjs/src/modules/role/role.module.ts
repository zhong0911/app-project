/**
 * 角色模块（对标 Spring 的 @Service 扫描范围）。
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { Role } from './role.entity';
import { RoleRepository } from './role.repository';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Role, User])],
  providers: [RoleRepository, RoleService],
  controllers: [RoleController],
  exports: [RoleService, RoleRepository],
})
export class RoleModule {}
