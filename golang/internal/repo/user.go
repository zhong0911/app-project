// Package repo 用户仓储层（MySQL users，对标 nodejs user-repo.js）。
//
// 字段：id / uid / role / status / deleted / version / create_time / update_time。
// 删除均为软删除（deleted=1 进入回收站）。
package repo

import (
	"context"
	"database/sql"

	"antx/golang-template/internal/result"
)

const columns = "id, uid, role, status, deleted, version, create_time, update_time"

// UserVO 用户出参（对标 nodejs toVO）。
type UserVO struct {
	ID         int64   `json:"id"`
	UID        string  `json:"uid"`
	Role       string  `json:"role"`
	Status     int     `json:"status"`
	Deleted    int     `json:"deleted"`
	CreateTime *string `json:"createTime"`
	UpdateTime *string `json:"updateTime"`
}

// UserRepo 用户仓储。
type UserRepo struct {
	db *sql.DB
}

// New 构造仓储。
func New(db *sql.DB) *UserRepo {
	return &UserRepo{db: db}
}

// Page 分页查询；deleted=0 正常列表，deleted=1 回收站。
func (r *UserRepo) Page(ctx context.Context, pageNum, pageSize int, uid string, status *int, deleted int) (int64, []UserVO, error) {
	size := pageSize
	if size < 1 {
		size = 1
	}
	if size > 100 {
		size = 100
	}
	if pageNum < 1 {
		pageNum = 1
	}
	offset := (pageNum - 1) * size

	wheres := "deleted = ?"
	params := []any{deleted}
	if uid != "" {
		wheres += " AND uid = ?"
		params = append(params, uid)
	}
	if status != nil {
		wheres += " AND status = ?"
		params = append(params, *status)
	}

	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) AS total FROM users WHERE "+wheres, params...).Scan(&total); err != nil {
		return 0, nil, err
	}

	listParams := append(append([]any{}, params...), offset, size)
	rows, err := r.db.QueryContext(ctx,
		"SELECT "+columns+" FROM users WHERE "+wheres+" ORDER BY create_time DESC, id DESC LIMIT ?, ?",
		listParams...)
	if err != nil {
		return 0, nil, err
	}
	defer rows.Close()

	records := make([]UserVO, 0)
	for rows.Next() {
		vo, err := scanUser(rows)
		if err != nil {
			return 0, nil, err
		}
		records = append(records, vo)
	}
	if err := rows.Err(); err != nil {
		return 0, nil, err
	}
	return total, records, nil
}

// GetByUID 按 uid 查询。
func (r *UserRepo) GetByUID(ctx context.Context, uid string, includeDeleted bool) (*UserVO, error) {
	query := "SELECT " + columns + " FROM users WHERE uid = ?"
	if !includeDeleted {
		query += " AND deleted = 0"
	}
	query += " LIMIT 1"
	row := r.db.QueryRowContext(ctx, query, uid)
	vo, err := scanUser(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &vo, nil
}

// GetByID 按 id 查询。
func (r *UserRepo) GetByID(ctx context.Context, id int64, includeDeleted bool) (*UserVO, error) {
	query := "SELECT " + columns + " FROM users WHERE id = ?"
	if !includeDeleted {
		query += " AND deleted = 0"
	}
	query += " LIMIT 1"
	row := r.db.QueryRowContext(ctx, query, id)
	vo, err := scanUser(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &vo, nil
}

// Create 新增用户；uid 已存在（含回收站）时抛出数据冲突。
func (r *UserRepo) Create(ctx context.Context, uid string) (*UserVO, error) {
	exists, err := r.GetByUID(ctx, uid, true)
	if err != nil {
		return nil, err
	}
	if exists != nil {
		if exists.Deleted == 1 {
			return nil, result.NewBusiness(result.DataConflict, "该 uid 已在回收站，请先恢复")
		}
		return nil, result.NewBusiness(result.DataConflict, "SSO 用户已存在: "+uid)
	}

	res, err := r.db.ExecContext(ctx,
		"INSERT INTO users (uid, role, status, deleted, version) VALUES (?, 'USER', 1, 0, 1)", uid)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, id, false)
}

// UpdateStatus 启用 / 禁用。
func (r *UserRepo) UpdateStatus(ctx context.Context, id int64, status int) (*UserVO, error) {
	if status != 0 && status != 1 {
		return nil, result.NewBusiness(result.BadRequest, "状态仅支持 0-禁用 / 1-启用")
	}
	current, err := r.GetByID(ctx, id, false)
	if err != nil {
		return nil, err
	}
	if current == nil {
		return nil, result.NewBusiness(result.NotFound, "用户不存在")
	}
	if _, err := r.db.ExecContext(ctx, "UPDATE users SET status = ? WHERE id = ? AND deleted = 0", status, id); err != nil {
		return nil, err
	}
	return r.GetByID(ctx, id, false)
}

// SoftDelete 软删除（移入回收站）。
func (r *UserRepo) SoftDelete(ctx context.Context, id int64) error {
	current, err := r.GetByID(ctx, id, false)
	if err != nil {
		return err
	}
	if current == nil {
		return result.NewBusiness(result.NotFound, "用户不存在")
	}
	_, err = r.db.ExecContext(ctx, "UPDATE users SET deleted = 1 WHERE id = ? AND deleted = 0", id)
	return err
}

// Restore 从回收站恢复。
func (r *UserRepo) Restore(ctx context.Context, id int64) (*UserVO, error) {
	current, err := r.GetByID(ctx, id, true)
	if err != nil {
		return nil, err
	}
	if current == nil || current.Deleted != 1 {
		return nil, result.NewBusiness(result.NotFound, "回收站中不存在该用户")
	}
	if _, err := r.db.ExecContext(ctx, "UPDATE users SET deleted = 0 WHERE id = ? AND deleted = 1", id); err != nil {
		return nil, err
	}
	return r.GetByID(ctx, id, false)
}

// Purge 彻底删除（仅回收站中的用户）。
func (r *UserRepo) Purge(ctx context.Context, id int64) error {
	res, err := r.db.ExecContext(ctx, "DELETE FROM users WHERE id = ? AND deleted = 1", id)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return result.NewBusiness(result.NotFound, "回收站中不存在该用户")
	}
	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanUser(scanner rowScanner) (UserVO, error) {
	var (
		vo      UserVO
		version int
		create  sql.NullTime
		update  sql.NullTime
	)
	err := scanner.Scan(&vo.ID, &vo.UID, &vo.Role, &vo.Status, &vo.Deleted, &version, &create, &update)
	if err != nil {
		return UserVO{}, err
	}
	vo.CreateTime = formatTime(create)
	vo.UpdateTime = formatTime(update)
	return vo, nil
}

func formatTime(value sql.NullTime) *string {
	if !value.Valid {
		return nil
	}
	formatted := value.Time.Format("2006-01-02 15:04:05")
	return &formatted
}
