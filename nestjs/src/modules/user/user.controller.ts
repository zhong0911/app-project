/**
 * 用户接口（对标 Spring Boot 的 controller/UserController）。
 * 全部需要登录（LoginGuard）；入参 DTO、出参 VO、JSON body。
 */
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { LoginGuard } from '../../common/guards/login.guard';
import { Result, ResultBody } from '../../common/result/result';
import { UserCreateDto, UserQueryDto, UserUpdateDto } from './dto/user.dto';
import { UserService } from './user.service';
import { UserVO } from './vo/user.vo';

@Controller('api/users')
@UseGuards(LoginGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body() dto: UserCreateDto): Promise<ResultBody<UserVO>> {
    return Result.success(await this.userService.createUser(dto));
  }

  @Put()
  async update(@Body() dto: UserUpdateDto): Promise<ResultBody<UserVO>> {
    return Result.success(await this.userService.updateUser(dto));
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResultBody<null>> {
    await this.userService.deleteUser(Number(id));
    return Result.success();
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<ResultBody<UserVO>> {
    return Result.success(await this.userService.getUserById(Number(id)));
  }

  @Get()
  async page(@Query() query: UserQueryDto): Promise<ResultBody<any>> {
    return Result.success(await this.userService.pageQuery(query));
  }
}
