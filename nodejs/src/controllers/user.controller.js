/**
 * 用户接口（对标 Spring Boot 的 controller/UserController）。
 * 全部需要登录；入参 DTO、出参 VO、JSON body。
 */
import { success } from '../utils/result.js';
import { userService } from '../services/user.service.js';
import { UserCreateDTO, UserQueryDTO, UserUpdateDTO } from '../dtos/user.dto.js';

export async function create(req, res, next) {
  try {
    res.json(success(await userService.createUser(UserCreateDTO.validate(req.body))));
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    res.json(success(await userService.updateUser(UserUpdateDTO.validate(req.body))));
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

export async function detail(req, res, next) {
  try {
    res.json(success(await userService.getUserById(Number(req.params.id))));
  } catch (error) {
    next(error);
  }
}

export async function page(req, res, next) {
  try {
    res.json(success(await userService.pageQuery(UserQueryDTO.validate(req.query))));
  } catch (error) {
    next(error);
  }
}
