/**
 * 数据库模块（对标 Spring Boot 的 MyBatis-Plus / DataSource 自动配置）。
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../modules/user/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('db.host'),
        port: config.get<number>('db.port'),
        username: config.get<string>('db.username'),
        password: config.get<string>('db.password'),
        database: config.get<string>('db.database'),
        entities: [User],
        // 生产禁用 synchronize，建表走 sql/init.sql
        synchronize: config.get<boolean>('db.synchronize'),
        logging: config.get<boolean>('db.logging'),
        timezone: '+08:00',
        charset: 'utf8mb4',
      }),
    }),
  ],
})
export class DatabaseModule {}
