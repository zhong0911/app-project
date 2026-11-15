/**
 * 根模块（对标 Spring Boot 启动类上的组件扫描 + 自动配置汇总）。
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { configuration } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { IdentityGuard } from './common/guards/identity.guard';
import { UserModule } from './modules/user/user.module';
import { SsoModule } from './modules/sso/sso.module';
import { AuthModule } from './modules/auth/auth.module';
import { BffModule } from './modules/bff/bff.module';
import { AdminUserModule } from './modules/admin-user/admin-user.module';
import { RoleModule } from './modules/role/role.module';
import { DemoModule } from './modules/demo/demo.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    UserModule,
    SsoModule,
    AuthModule,
    BffModule,
    AdminUserModule,
    RoleModule,
    DemoModule,
  ],
  providers: [
    // 全局身份解析（不拦截，只把 Principal 挂到 request 上）
    { provide: APP_GUARD, useClass: IdentityGuard },
  ],
})
export class AppModule {}
