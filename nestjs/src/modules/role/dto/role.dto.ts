/**
 * 角色入参 DTO（对标 Spring Boot 的 dto/RoleDTO）。
 */
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

/** 角色新增 / 更新入参（编码统一大写，只允许字母、数字与下划线） */
export class RoleDto {
  @IsString({ message: '角色编码不能为空' })
  @IsNotEmpty({ message: '角色编码不能为空' })
  @Matches(/^[A-Za-z][A-Za-z0-9_]{1,31}$/, {
    message: '角色编码只允许字母、数字与下划线，长度 2-32',
  })
  code: string;

  @IsString({ message: '角色名称不能为空' })
  @IsNotEmpty({ message: '角色名称不能为空' })
  @Length(1, 64, { message: '角色名称长度不能超过 64' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: '角色描述长度不能超过 255' })
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1], { message: '状态仅支持 0-禁用 / 1-启用' })
  status?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '排序必须是整数' })
  sort?: number;
}

/** 角色列表查询入参 */
export class RoleQueryDto {
  @IsOptional()
  @IsIn(['true', 'false', '1', '0', true, false])
  includeDisabled?: string | boolean;
}
