<?php

declare(strict_types=1);

namespace AntX\Template;

/**
 * 用户仓储层（MySQL users，对标 Spring Boot UserMapper）。
 *
 * 字段：id / uid / role / status / deleted / version / create_time / update_time。
 * 删除均为软删除（deleted=1 进入回收站）。
 */
final class UserRepository
{
    private const COLUMNS = 'id, uid, role, status, deleted, version, create_time, update_time';

    private function pdo(): \PDO
    {
        return Database::pdo();
    }

    /** 分页查询；$deleted=0 正常列表，$deleted=1 回收站 */
    public function page(int $pageNum, int $pageSize, ?string $uid, ?int $status, int $deleted): array
    {
        $pageNum = max(1, $pageNum);
        $pageSize = max(1, min(100, $pageSize));
        $wheres = ['deleted = :deleted'];
        $params = [':deleted' => $deleted];
        if ($uid !== null && $uid !== '') {
            $wheres[] = 'uid = :uid';
            $params[':uid'] = $uid;
        }
        if ($status !== null) {
            $wheres[] = 'status = :status';
            $params[':status'] = $status;
        }
        $whereSql = implode(' AND ', $wheres);

        $countStmt = $this->pdo()->prepare("SELECT COUNT(*) AS total FROM users WHERE {$whereSql}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $offset = ($pageNum - 1) * $pageSize;
        $sql = 'SELECT ' . self::COLUMNS . " FROM users WHERE {$whereSql} "
            . 'ORDER BY create_time DESC, id DESC LIMIT :offset, :limit';
        $stmt = $this->pdo()->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, is_int($value) ? \PDO::PARAM_INT : \PDO::PARAM_STR);
        }
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->bindValue(':limit', $pageSize, \PDO::PARAM_INT);
        $stmt->execute();
        $records = array_map([self::class, 'toVO'], $stmt->fetchAll());

        return ['total' => $total, 'records' => $records];
    }

    public function getByUid(string $uid, bool $includeDeleted = false): ?array
    {
        $sql = 'SELECT ' . self::COLUMNS . ' FROM users WHERE uid = :uid';
        if (!$includeDeleted) {
            $sql .= ' AND deleted = 0';
        }
        $stmt = $this->pdo()->prepare($sql . ' LIMIT 1');
        $stmt->execute([':uid' => $uid]);
        $row = $stmt->fetch();
        return $row === false ? null : self::toVO($row);
    }

    public function getById(int $id, bool $includeDeleted = false): ?array
    {
        $sql = 'SELECT ' . self::COLUMNS . ' FROM users WHERE id = :id';
        if (!$includeDeleted) {
            $sql .= ' AND deleted = 0';
        }
        $stmt = $this->pdo()->prepare($sql . ' LIMIT 1');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row === false ? null : self::toVO($row);
    }

    public function create(string $uid): array
    {
        $exists = $this->getByUid($uid, true);
        if ($exists !== null) {
            if ((int) $exists['deleted'] === 1) {
                throw new BusinessException(ResultCode::DATA_CONFLICT, '该 uid 已在回收站，请先恢复');
            }
            throw new BusinessException(ResultCode::DATA_CONFLICT, 'SSO 用户已存在: ' . $uid);
        }
        $stmt = $this->pdo()->prepare(
            "INSERT INTO users (uid, role, status, deleted, version) VALUES (:uid, 'USER', 1, 0, 1)"
        );
        $stmt->execute([':uid' => $uid]);
        $id = (int) $this->pdo()->lastInsertId();
        return $this->getById($id);
    }

    public function updateStatus(int $id, int $status): array
    {
        if ($status !== 0 && $status !== 1) {
            throw new BusinessException(ResultCode::BAD_REQUEST, '状态仅支持 0-禁用 / 1-启用');
        }
        if ($this->getById($id) === null) {
            throw new BusinessException(ResultCode::NOT_FOUND, '用户不存在');
        }
        $stmt = $this->pdo()->prepare('UPDATE users SET status = :status WHERE id = :id AND deleted = 0');
        $stmt->execute([':status' => $status, ':id' => $id]);
        return $this->getById($id);
    }

    public function softDelete(int $id): void
    {
        if ($this->getById($id) === null) {
            throw new BusinessException(ResultCode::NOT_FOUND, '用户不存在');
        }
        $stmt = $this->pdo()->prepare('UPDATE users SET deleted = 1 WHERE id = :id AND deleted = 0');
        $stmt->execute([':id' => $id]);
    }

    public function restore(int $id): array
    {
        $row = $this->getById($id, true);
        if ($row === null || (int) $row['deleted'] !== 1) {
            throw new BusinessException(ResultCode::NOT_FOUND, '回收站中不存在该用户');
        }
        $stmt = $this->pdo()->prepare('UPDATE users SET deleted = 0 WHERE id = :id AND deleted = 1');
        $stmt->execute([':id' => $id]);
        return $this->getById($id);
    }

    public function purge(int $id): void
    {
        $stmt = $this->pdo()->prepare('DELETE FROM users WHERE id = :id AND deleted = 1');
        $stmt->execute([':id' => $id]);
        if ($stmt->rowCount() === 0) {
            throw new BusinessException(ResultCode::NOT_FOUND, '回收站中不存在该用户');
        }
    }

    private static function toVO(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'uid' => (string) $row['uid'],
            'role' => (string) $row['role'],
            'status' => (int) $row['status'],
            'deleted' => (int) $row['deleted'],
            'createTime' => $row['create_time'] !== null ? (string) $row['create_time'] : null,
            'updateTime' => $row['update_time'] !== null ? (string) $row['update_time'] : null,
        ];
    }
}
