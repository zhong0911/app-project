/**
 * 用户实体（对标 Spring Boot 的 entity/User）。
 * 表 users 以 SSO uid 为身份键，本地只维护角色 / 启停 / 软删除。
 */
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  /** SSO 用户 uid（= access_token 的 sub），唯一键 */
  @Index('uk_uid', { unique: true })
  @Column({ length: 64 })
  uid: string;

  /** 子应用角色：ADMIN / USER */
  @Column({ length: 20, default: 'USER' })
  role: string;

  /** 启停状态：1-启用，0-禁用 */
  @Column({ type: 'tinyint', default: 1 })
  status: number;

  /** 逻辑删除：0-未删除，1-已删除（回收站） */
  @Column({ type: 'tinyint', default: 0 })
  deleted: number;

  /** 乐观锁版本号 */
  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'create_time', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createTime: Date;

  @Column({
    name: 'update_time',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updateTime: Date;
}
