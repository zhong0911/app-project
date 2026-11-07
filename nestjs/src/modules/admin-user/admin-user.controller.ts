/**
 * 管理后台用户管理（对标 Spring Boot 的 controller/AdminUserController）。
 * 仅管理员可访问（AdminGuard）；删除一律软删除。
 */
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Result, ResultBody } from '../../common/result/result';
import { UserCreateDto, UserQueryDto, UserStatusDto } from '../user/dto/user.dto';
import { UserService } from '../user/user.service';
import { UserVO } from '../user/vo/user.vo';

@Controller('api/admin/users')
@UseGuards(AdminGuard)
export class AdminUserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async page(@Query() query: UserQueryDto): Promise<ResultBody<any>> {
    return Result.success(await this.userService.pageQuery(query));
  }

  @Get('recycle')
  async recycle(@Query() query: UserQueryDto): Promise<ResultBody<any>> {
    return Result.success(await this.userService.pageRecycle(query));
  }

  @Post()
  async create(@Body() dto: UserCreateDto): Promise<ResultBody<UserVO>> {
    return Result.success(await this.userService.createUser(dto));
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UserStatusDto,
  ): Promise<ResultBody<UserVO>> {
    return Result.success(await this.userService.updateStatus(Number(id), body.status));
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResultBody<null>> {
    await this.userService.deleteUser(Number(id));
    return Result.success();
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string): Promise<ResultBody<UserVO>> {
    return Result.success(await this.userService.restore(Number(id)));
  }

  @Delete(':id/purge')
  async purge(@Param('id') id: string): Promise<ResultBody<null>> {
    await this.userService.purge(Number(id));
    return Result.success();
  }
}
