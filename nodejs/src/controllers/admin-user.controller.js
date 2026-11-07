/**
 * 管理后台用户管理（对标 Spring Boot 的 controller/AdminUserController）。
 * 仅管理员可访问（requireAdmin 中间件已校验）；删除一律软删除。
 */
import { success } from '../utils/result.js';
import { userService } from '../services/user.service.js';
import { UserCreateDTO, UserQueryDTO, UserStatusDTO } from '../dtos/user.dto.js';

export async function page(req, res, next) {
  try {
    res.json(success(await userService.pageQuery(UserQueryDTO.validate(req.query))));
  } catch (error) {
    next(error);
  }
}

export async function recycle(req, res, next) {
  try {
    res.json(success(await userService.pageRecycle(UserQueryDTO.validate(req.query))));
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    res.json(success(await userService.createUser(UserCreateDTO.validate(req.body))));
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const { status } = UserStatusDTO.validate(req.body);
    res.json(success(await userService.updateStatus(Number(req.params.id), status)));
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await userService.deleteUser(Number(req.params.id));
    res.json(success());
  } catch (error) {
    next(error);
  }
}

export async function restore(req, res, next) {
  try {
    res.json(success(await userService.restore(Number(req.params.id))));
  } catch (error) {
    next(error);
  }
}

export async function purge(req, res, next) {
  try {
    await userService.purge(Number(req.params.id));
    res.json(success());
  } catch (error) {
    next(error);
  }
}
