/**
 * 角色实体（对标 Spring Boot 的 entity/Role）。
 *
 * 子应用本地角色字典：内置 ADMIN / USER（built_in=1，不可删除、不可改编码），
 * 可新增自定义角色；users.role 引用这里的 code。
 */
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  /** 角色编码（大写，如 ADMIN / USER / AUDITOR） */
  @Index('uk_code', { unique: true })
  @Column({ length: 32 })
  code: string;

  /** 角色名称 */
  @Column({ length: 64 })
  name: string;

  /** 角色描述 */
  @Column({ length: 255, nullable: true })
  description: string | null;

  /** 内置角色：1-内置（不可删除、不可改编码） */
  @Column({ name: 'built_in', type: 'tinyint', default: 0 })
  builtIn: number;

  /** 状态：1-启用，0-禁用 */
  @Column({ type: 'tinyint', default: 1 })
  status: number;

  /** 排序（升序） */
  @Column({ type: 'int', default: 0 })
  sort: number;

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
