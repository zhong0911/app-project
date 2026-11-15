/**
 * 角色出参 VO（对标 Spring Boot 的 vo/RoleVO）。
 */
import { Role } from '../role.entity';

export interface RoleVO {
  id: number;
  code: string;
  name: string;
  description: string | null;
  builtIn: number;
  status: number;
  sort: number;
  createTime: string | null;
  updateTime: string | null;
}

const formatDate = (value?: Date | string | null): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/** 实体 → VO（隐藏实体内部字段） */
export function toRoleVO(role: Role | null): RoleVO | null {
  if (!role) return null;
  return {
    id: Number(role.id),
    code: role.code,
    name: role.name,
    description: role.description ?? null,
    builtIn: Number(role.builtIn),
    status: Number(role.status),
    sort: Number(role.sort),
    createTime: formatDate(role.createTime),
    updateTime: formatDate(role.updateTime),
  };
}
