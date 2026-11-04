package handler

import (
	"net/http"

	"antx/golang-template/internal/result"
)

// health GET /api/health -> {"status":"up","service":"golang"}。
func (h *Handler) health(w http.ResponseWriter, _ *http.Request) error {
	data := struct {
		Status  string `json:"status"`
		Service string `json:"service"`
	}{Status: "up", Service: "golang"}
	writeJSON(w, http.StatusOK, result.SuccessWith(data))
	return nil
}
