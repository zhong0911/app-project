/**
 * 应用入口（对标 Spring Boot 的 TemplateApplication）。
 * 装配会话、CORS、参数校验、全局异常，然后监听端口。
 */
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import session from 'express-session';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  const config = app.get(ConfigService);

  // 会话：SSO token 存服务端会话，前端只拿 Cookie
  app.use(
    session({
      name: config.get<string>('session.name')!,
      secret: config.get<string>('session.secret')!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: config.get<number>('session.maxAge')!,
      },
    }),
  );

  // CORS：允许携带 Cookie 的来源（生产写具体域名，不能 *）
  app.enableCors({
    origin: config.get<string[]>('cors.origins'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // 参数校验：DTO 上的 class-validator 规则（对标 @Valid）
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      stopAtFirstError: false,
    }),
  );

  // 全局异常（统一五字段响应）
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = config.get<number>('app.port')!;
  await app.listen(port);
  console.log(`[boot] ${config.get<string>('app.name')} 已启动: http://localhost:${port}`);
  console.log(`[boot] SSO 回调地址: ${config.get<string>('sso.redirectUri')}`);
}

bootstrap();
