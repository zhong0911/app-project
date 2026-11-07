/**
 * 用户入参 DTO（对标 Spring Boot 的 dto/UserCreateDTO / UserUpdateDTO / UserQueryDTO）。
 */
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class UserCreateDto {
  @IsString({ message: 'uid 必须是字符串' })
  @IsNotEmpty({ message: 'SSO 用户 uid 不能为空' })
  @Length(1, 64, { message: 'uid 长度不能超过 64 个字符' })
  uid: string;
}

export class UserUpdateDto {
  @Type(() => Number)
  @IsInt({ message: '用户 ID 不能为空' })
  @Min(1, { message: '用户 ID 不合法' })
  id: number;

  @IsString({ message: '角色不能为空' })
  @IsIn(['ADMIN', 'USER', 'admin', 'user'], { message: '角色不合法，仅支持 ADMIN / USER' })
  role: string;
}

export class UserStatusDto {
  @Type(() => Number)
  @IsIn([0, 1], { message: '状态仅支持 0-禁用 / 1-启用' })
  status: number;
}

export class UserQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: '页码不能小于 1' })
  pageNum: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: '每页条数不能小于 1' })
  @Max(500, { message: '每页条数不能超过 500' })
  pageSize: number = 10;

  @IsOptional()
  @IsString()
  uid?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ADMIN', 'USER', 'admin', 'user'], { message: '角色不合法，仅支持 ADMIN / USER' })
  role?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;
}
