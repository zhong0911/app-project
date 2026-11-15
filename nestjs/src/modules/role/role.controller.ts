/**
 * 管理后台角色字典（对标 Spring Boot 的 controller/RoleController）。
 * 仅管理员可访问（AdminGuard）。
 */
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Result, ResultBody } from '../../common/result/result';
import { RoleDto, RoleQueryDto } from './dto/role.dto';
import { RoleService } from './role.service';
import { RoleVO } from './vo/role.vo';

@Controller('api/admin/roles')
@UseGuards(AdminGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  /** 角色列表（默认只返回启用角色，includeDisabled=true 返回全部） */
  @Get()
  async list(@Query() query: RoleQueryDto): Promise<ResultBody<RoleVO[]>> {
    const value = String(query.includeDisabled ?? 'false').toLowerCase();
    return Result.success(await this.roleService.listRoles(value === 'true' || value === '1'));
  }

  /** 新增角色 */
  @Post()
  async create(@Body() dto: RoleDto): Promise<ResultBody<RoleVO>> {
    return Result.success(await this.roleService.createRole(dto));
  }

  /** 更新角色（内置角色编码不可改） */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: RoleDto): Promise<ResultBody<RoleVO>> {
    return Result.success(await this.roleService.updateRole(Number(id), dto));
  }

  /** 删除角色（内置角色、仍被用户使用的角色不可删） */
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResultBody<null>> {
    await this.roleService.deleteRole(Number(id));
    return Result.success(null);
  }
}
