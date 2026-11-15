/**
 * 用户仓储层（对标 Spring Boot 的 mapper/UserMapper）。
 * 只做数据库 CRUD，所有查询默认过滤 deleted = 0。
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

export interface PageQuery {
  pageNum: number;
  pageSize: number;
  uid?: string;
  role?: string;
  status?: number;
  deleted?: number;
}

@Injectable()
export class UserRepository {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  findById(id: number, includeDeleted = false): Promise<User | null> {
    return this.repo.findOne({
      where: includeDeleted ? { id: String(id) } : { id: String(id), deleted: 0 },
    });
  }

  findByUid(uid: string): Promise<User | null> {
    return this.repo.findOne({ where: { uid, deleted: 0 } });
  }

  /** 含回收站记录：创建前查重，避免软删除后重复插入触发唯一键冲突 */
  findByUidIncludingDeleted(uid: string): Promise<User | null> {
    return this.repo.findOne({ where: { uid } });
  }

  async page(query: PageQuery): Promise<{ total: number; records: User[] }> {
    const qb = this.repo.createQueryBuilder('u').where('u.deleted = :deleted', {
      deleted: query.deleted ?? 0,
    });
    if (query.uid) qb.andWhere('u.uid = :uid', { uid: query.uid });
    if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    if (query.status !== undefined) qb.andWhere('u.status = :status', { status: query.status });

    qb.orderBy('u.createTime', 'DESC')
      .addOrderBy('u.id', 'DESC')
      .skip((query.pageNum - 1) * query.pageSize)
      .take(query.pageSize);

    const [records, total] = await qb.getManyAndCount();
    return { total, records };
  }

  insert(uid: string, role = 'USER'): Promise<User> {
    return this.repo.save(
      this.repo.create({ uid, role, status: 1, deleted: 0, version: 1 }),
    );
  }

  async updateRole(id: number, role: string): Promise<User | null> {
    await this.repo.update({ id: String(id) }, { role });
    return this.findById(id, true);
  }

  async updateStatus(id: number, status: number): Promise<User | null> {
    await this.repo.update({ id: String(id) }, { status });
    return this.findById(id, true);
  }

  async softDelete(id: number): Promise<void> {
    await this.repo.update({ id: String(id), deleted: 0 }, { deleted: 1 });
  }

  async restore(id: number): Promise<User | null> {
    await this.repo.update({ id: String(id), deleted: 1 }, { deleted: 0 });
    return this.findById(id);
  }

  async purge(id: number): Promise<void> {
    await this.repo.delete({ id: String(id), deleted: 1 });
  }
}
