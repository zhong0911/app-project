package handler

import (
	"math"
	"net/http"

	"antx/golang-template/internal/result"
)

// listUsers GET /api/users?pageNum=1&pageSize=10 分页列表（内存示例）。
func (h *Handler) listUsers(w http.ResponseWriter, r *http.Request) error {
	query := r.URL.Query()
	pageNum := queryInt(query.Get("pageNum"), 1)
	if pageNum < 1 {
		pageNum = 1
	}
	pageSize := queryInt(query.Get("pageSize"), 10)
	if pageSize < 1 {
		pageSize = 1
	}
	if pageSize > 100 {
		pageSize = 100
	}

	h.sampleMu.Lock()
	all := make([]sampleUser, len(h.sample))
	for i, u := range h.sample {
		all[i] = *u
	}
	h.sampleMu.Unlock()

	total := len(all)
	start := (pageNum - 1) * pageSize
	if start > total {
		start = total
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	records := make([]sampleUser, 0, end-start)
	records = append(records, all[start:end]...)

	writeJSON(w, http.StatusOK, result.SuccessWith(result.NewPageResult(pageNum, pageSize, int64(total), records)))
	return nil
}

// createUser POST /api/users 创建用户（JSON body）。
func (h *Handler) createUser(w http.ResponseWriter, r *http.Request) error {
	body, err := decodeBody(r)
	if err != nil {
		return err
	}
	rawUID, exists := body["uid"]
	if !exists || rawUID == nil {
		return result.BadRequestError("uid 不能为空")
	}
	uid, ok := rawUID.(string)
	if !ok || uid == "" {
		return result.BadRequestError("uid 不能为空")
	}

	h.sampleMu.Lock()
	defer h.sampleMu.Unlock()
	for _, u := range h.sample {
		if u.UID == uid {
			return result.NewBusiness(result.DataConflict, "uid 已存在")
		}
	}
	h.seq++
	user := &sampleUser{ID: h.seq, UID: uid, Role: "USER", CreateTime: sampleTime()}
	h.sample = append(h.sample, user)

	writeJSON(w, http.StatusOK, result.SuccessWith(user))
	return nil
}

// updateUser PUT /api/users 更新用户（JSON body）。
func (h *Handler) updateUser(w http.ResponseWriter, r *http.Request) error {
	body, err := decodeBody(r)
	if err != nil {
		return err
	}

	h.sampleMu.Lock()
	index := h.sampleIndexRaw(body["id"])
	if index < 0 {
		h.sampleMu.Unlock()
		return result.NewBusiness(result.NotFound, "用户不存在")
	}
	if role, ok := body["role"]; ok {
		h.sample[index].Role = role
	}
	user := *h.sample[index]
	h.sampleMu.Unlock()

	writeJSON(w, http.StatusOK, result.SuccessWith(user))
	return nil
}

// deleteUser DELETE /api/users/{id}。
func (h *Handler) deleteUser(w http.ResponseWriter, r *http.Request) error {
	h.sampleMu.Lock()
	defer h.sampleMu.Unlock()
	index := h.sampleIndexRaw(r.PathValue("id"))
	if index < 0 {
		return result.NewBusiness(result.NotFound, "用户不存在")
	}
	h.sample = append(h.sample[:index], h.sample[index+1:]...)

	writeJSON(w, http.StatusOK, result.SuccessResult())
	return nil
}

// getUser GET /api/users/{id}。
func (h *Handler) getUser(w http.ResponseWriter, r *http.Request) error {
	h.sampleMu.Lock()
	index := h.sampleIndexRaw(r.PathValue("id"))
	var user *sampleUser
	if index >= 0 {
		copied := *h.sample[index]
		user = &copied
	}
	h.sampleMu.Unlock()

	if user == nil {
		return result.NewBusiness(result.NotFound, "用户不存在")
	}
	writeJSON(w, http.StatusOK, result.SuccessWith(user))
	return nil
}

// sampleIndexRaw 支持路径字符串与 JSON 数值；仅接受整数 id。
func (h *Handler) sampleIndexRaw(raw any) int {
	f, ok := jsNumber(raw)
	if !ok || math.Trunc(f) != f {
		return -1
	}
	id := int64(f)
	for i, u := range h.sample {
		if u.ID == id {
			return i
		}
	}
	return -1
}
