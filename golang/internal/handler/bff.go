package handler

import (
	"net/http"

	"antx/golang-template/internal/auth"
	"antx/golang-template/internal/result"
)

type bffMeVO struct {
	AuthType string  `json:"authType"`
	UID      string  `json:"uid"`
	Name     string  `json:"name"`
	Role     *string `json:"role"`
	IsAdmin  bool    `json:"isAdmin"`
	Status   *int    `json:"status"`
	LocalID  *int64  `json:"localId"`
}

// bffMe GET /api/bff/me 当前 SSO 身份 + 本地角色 + 是否管理员 + 启停状态。
func (h *Handler) bffMe(w http.ResponseWriter, r *http.Request) error {
	uid := auth.CurrentUID(r, h.cfg)
	if uid == "" {
		return result.NewBusiness(result.Unauthorized, "")
	}
	local, err := h.users.GetByUID(r.Context(), uid, false)
	if err != nil {
		return err
	}

	vo := bffMeVO{
		AuthType: "sso",
		UID:      uid,
		Name:     uid,
		IsAdmin:  auth.IsAdmin(uid, h.cfg),
	}
	if local != nil {
		role := local.Role
		status := local.Status
		id := local.ID
		vo.Role = &role
		vo.Status = &status
		vo.LocalID = &id
	}

	writeJSON(w, http.StatusOK, result.SuccessWith(vo))
	return nil
}
