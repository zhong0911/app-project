/**
 * 用户出参 VO（对标 Spring Boot 的 vo/UserVO、vo/BffUserVO）。
 */
import { User } from '../user.entity';

export interface UserVO {
  id: number;
  uid: string;
  role: string;
  status: number;
  deleted: number;
  createTime: string | null;
  updateTime: string | null;
}

export interface BffUserVO {
  authType?: string;
  uid?: string | null;
  localId?: number;
  role?: string;
  isAdmin?: boolean;
  status?: number;
  name?: string | null;
}

const formatDate = (value?: Date | string | null): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/** 实体 → VO（隐藏 version 等内部字段） */
export function toUserVO(user: User | null): UserVO | null {
  if (!user) return null;
  return {
    id: Number(user.id),
    uid: user.uid,
    role: user.role,
    status: Number(user.status),
    deleted: Number(user.deleted),
    createTime: formatDate(user.createTime),
    updateTime: formatDate(user.updateTime),
  };
}
