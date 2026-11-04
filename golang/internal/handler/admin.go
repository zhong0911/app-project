package handler

import (
	"net/http"
	"strings"

	"antx/golang-template/internal/auth"
	"antx/golang-template/internal/result"
)

// adminListUsers GET /api/admin/users 用户列表（deleted=0）。
func (h *Handler) adminListUsers(w http.ResponseWriter, r *http.Request) error {
	if _, err := auth.RequireAdmin(r.Context(), r, h.cfg, h.users); err != nil {
		return err
	}
	query := r.URL.Query()
	pageNum := queryInt(query.Get("pageNum"), 1)
	pageSize := queryInt(query.Get("pageSize"), 10)

	status := queryStatus(query.Get("status"))
	total, records, err := h.users.Page(r.Context(), pageNum, pageSize, query.Get("uid"), status, 0)
	if err != nil {
		return err
	}

	writeJSON(w, http.StatusOK, result.SuccessWith(result.NewPageResult(pageNum, pageSize, total, records)))
	return nil
}

// adminRecycle GET /api/admin/users/recycle 回收站列表（deleted=1）。
func (h *Handler) adminRecycle(w http.ResponseWriter, r *http.Request) error {
	if _, err := auth.RequireAdmin(r.Context(), r, h.cfg, h.users); err != nil {
		return err
	}
	query := r.URL.Query()
	pageNum := queryInt(query.Get("pageNum"), 1)
	pageSize := queryInt(query.Get("pageSize"), 10)

	total, records, err := h.users.Page(r.Context(), pageNum, pageSize, query.Get("uid"), nil, 1)
	if err != nil {
		return err
	}

	writeJSON(w, http.StatusOK, result.SuccessWith(result.NewPageResult(pageNum, pageSize, total, records)))
	return nil
}

// adminCreateUser POST /api/admin/users 添加用户（指定 SSO uid）。
func (h *Handler) adminCreateUser(w http.ResponseWriter, r *http.Request) error {
	if _, err := auth.RequireAdmin(r.Context(), r, h.cfg, h.users); err != nil {
		return err
	}
	body, err := decodeBody(r)
	if err != nil {
		return err
	}
	uid := strings.TrimSpace(jsString(body["uid"]))
	if uid == "" || len([]rune(uid)) > 64 {
		return result.BadRequestError("SSO 用户 uid 不能为空且长度不超过 64")
	}
	user, err := h.users.Create(r.Context(), uid)
	if err != nil {
		return err
	}

	writeJSON(w, http.StatusOK, result.SuccessWith(user))
	return nil
}

// adminUpdateStatus PUT /api/admin/users/{id}/status 启用 / 禁用。
func (h *Handler) adminUpdateStatus(w http.ResponseWriter, r *http.Request) error {
	if _, err := auth.RequireAdmin(r.Context(), r, h.cfg, h.users); err != nil {
		return err
	}
	body, err := decodeBody(r)
	if err != nil {
		return err
	}
	value, exists := body["status"]
	status, ok := jsNumber(value)
	if !exists || !ok || status != 0 && status != 1 {
		return result.BadRequestError("状态仅支持 0-禁用 / 1-启用")
	}
	id, err := pathID(r.PathValue("id"))
	if err != nil {
		return err
	}
	user, err := h.users.UpdateStatus(r.Context(), id, int(status))
	if err != nil {
		return err
	}

	writeJSON(w, http.StatusOK, result.SuccessWith(user))
	return nil
}

// adminSoftDelete DELETE /api/admin/users/{id} 软删除（移入回收站）。
func (h *Handler) adminSoftDelete(w http.ResponseWriter, r *http.Request) error {
	if _, err := auth.RequireAdmin(r.Context(), r, h.cfg, h.users); err != nil {
		return err
	}
	id, err := pathID(r.PathValue("id"))
	if err != nil {
		return err
	}
	if err := h.users.SoftDelete(r.Context(), id); err != nil {
		return err
	}

	writeJSON(w, http.StatusOK, result.SuccessResult())
	return nil
}

// adminRestore POST /api/admin/users/{id}/restore 从回收站恢复。
func (h *Handler) adminRestore(w http.ResponseWriter, r *http.Request) error {
	if _, err := auth.RequireAdmin(r.Context(), r, h.cfg, h.users); err != nil {
		return err
	}
	id, err := pathID(r.PathValue("id"))
	if err != nil {
		return err
	}
	user, err := h.users.Restore(r.Context(), id)
	if err != nil {
		return err
	}

	writeJSON(w, http.StatusOK, result.SuccessWith(user))
	return nil
}

// adminPurge DELETE /api/admin/users/{id}/purge 彻底删除。
func (h *Handler) adminPurge(w http.ResponseWriter, r *http.Request) error {
	if _, err := auth.RequireAdmin(r.Context(), r, h.cfg, h.users); err != nil {
		return err
	}
	id, err := pathID(r.PathValue("id"))
	if err != nil {
		return err
	}
	if err := h.users.Purge(r.Context(), id); err != nil {
		return err
	}

	writeJSON(w, http.StatusOK, result.SuccessResult())
	return nil
}

// queryStatus 解析 status 过滤参数；空串或非法值视为不过滤。
func queryStatus(raw string) *int {
	if raw == "" {
		return nil
	}
	status, ok := jsNumber(raw)
	if !ok {
		return nil
	}
	value := int(status)
	return &value
}
