/**
 * BFF 聚合接口（对标 Spring Boot 的 controller/BffController）。
 * GET /api/bff/me —— 一次拿到登录态：SSO 身份 + 本地角色。
 */
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Principal } from '../../common/principal';
import { Result, ResultBody } from '../../common/result/result';
import { UserService } from '../user/user.service';
import { BffUserVO } from '../user/vo/user.vo';

@Controller('api/bff')
export class BffController {
  constructor(
    private readonly userService: UserService,
    private readonly config: ConfigService,
  ) {}

  @Get('me')
  async me(@CurrentUser() principal: Principal): Promise<ResultBody<BffUserVO>> {
    if (!principal?.uid) return Result.success({});

    const uid = principal.uid;
    const vo: BffUserVO = {
      authType: principal.authType,
      uid,
      name: principal.name,
      isAdmin: String(uid) === String(this.config.get<string>('sso.adminUid')),
    };

    // 聚合本地角色 / 启停状态（未注册则无角色）
    const local = await this.userService.getByUid(uid);
    if (local) {
      vo.localId = Number(local.id);
      vo.role = local.role;
      vo.status = Number(local.status);
    }
    return Result.success(vo);
  }
}
