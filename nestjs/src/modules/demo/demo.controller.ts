/**
 * 角色示例接口（对标 Spring Boot 的 controller/SecurityDemoController）。
 */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { LoginGuard } from '../../common/guards/login.guard';
import { Principal } from '../../common/principal';
import { Result, ResultBody } from '../../common/result/result';

@Controller('api/demo')
export class DemoController {
  @Get('admin')
  @UseGuards(AdminGuard)
  adminOnly(@CurrentUser() principal: Principal): ResultBody<string> {
    return Result.success(`你好，管理员 ${principal.name}`);
  }

  @Get('user')
  @UseGuards(LoginGuard)
  anyLoginUser(@CurrentUser() principal: Principal): ResultBody<string> {
    return Result.success(`你好，${principal.name}`);
  }
}
