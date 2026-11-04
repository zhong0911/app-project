// Package handler 实现 HTTP 路由与控制器（对标 nodejs routes/* 与 app.js）。
package handler

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"antx/golang-template/internal/config"
	"antx/golang-template/internal/repo"
	"antx/golang-template/internal/result"
)

// Handler 持有配置、仓储与内存示例数据。
type Handler struct {
	cfg   config.Config
	users *repo.UserRepo

	sampleMu sync.Mutex
	sample   []*sampleUser
	seq      int64
}

type sampleUser struct {
	ID         int64  `json:"id"`
	UID        string `json:"uid"`
	Role       any    `json:"role"`
	CreateTime string `json:"createTime"`
}

// New 构造路由。返回的 http.Handler 可直接交给 http.Server。
func New(cfg config.Config, db *sql.DB) http.Handler {
	h := &Handler{
		cfg:   cfg,
		users: repo.New(db),
		sample: []*sampleUser{
			{ID: 1, UID: "1", Role: "ADMIN", CreateTime: "2026-11-01 10:00:00"},
			{ID: 2, UID: "2", Role: "USER", CreateTime: "2026-11-01 10:05:00"},
		},
		seq: 2,
	}

	mux := http.NewServeMux()

	// 健康检查
	mux.HandleFunc("GET /api/health", h.wrap(h.health))

	// RESTful 用户示例（内存数据，对标 nodejs user.routes.js）
	mux.HandleFunc("GET /api/users", h.wrap(h.listUsers))
	mux.HandleFunc("POST /api/users", h.wrap(h.createUser))
	mux.HandleFunc("PUT /api/users", h.wrap(h.updateUser))
	mux.HandleFunc("GET /api/users/{id}", h.wrap(h.getUser))
	mux.HandleFunc("DELETE /api/users/{id}", h.wrap(h.deleteUser))

	// 管理后台用户管理（仅管理员）
	mux.HandleFunc("GET /api/admin/users", h.wrap(h.adminListUsers))
	mux.HandleFunc("POST /api/admin/users", h.wrap(h.adminCreateUser))
	mux.HandleFunc("GET /api/admin/users/recycle", h.wrap(h.adminRecycle))
	mux.HandleFunc("PUT /api/admin/users/{id}/status", h.wrap(h.adminUpdateStatus))
	mux.HandleFunc("DELETE /api/admin/users/{id}", h.wrap(h.adminSoftDelete))
	mux.HandleFunc("POST /api/admin/users/{id}/restore", h.wrap(h.adminRestore))
	mux.HandleFunc("DELETE /api/admin/users/{id}/purge", h.wrap(h.adminPurge))

	// BFF 登录态
	mux.HandleFunc("GET /api/bff/me", h.wrap(h.bffMe))

	// OAuth2 客户端路由
	mux.HandleFunc("GET /sso/authorize", h.wrap(h.authorize))
	mux.HandleFunc("GET /sso/callback", h.wrap(h.callback))

	// 认证 API
	mux.HandleFunc("POST /api/auth/logout", h.wrap(h.logout))

	// 404：未匹配任何路由 -> 统一响应
	mux.HandleFunc("/", notFound)

	return mux
}

type handlerFunc func(http.ResponseWriter, *http.Request) error

func (h *Handler) wrap(fn handlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := fn(w, r); err != nil {
			writeError(w, err)
		}
	}
}

func notFound(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusNotFound, result.ErrorMsg(result.NotFound, "请求资源不存在"))
}

// writeError 全局异常处理（对标 nodejs global-error-handler.js）：
// 业务码段 HTTP 状态统一用 200，HTTP 语义段保持对应状态；未知异常不暴露细节。
func writeError(w http.ResponseWriter, err error) {
	var be *result.BusinessException
	if errors.As(err, &be) {
		status := be.Code
		if be.Code >= 1000 {
			status = http.StatusOK
		}
		log.Printf("[业务异常] code=%d, message=%s", be.Code, be.Message)
		writeJSON(w, status, result.ErrorMsg(be.Code, be.Message))
		return
	}
	log.Printf("[全局异常] %v", err)
	writeJSON(w, http.StatusInternalServerError, result.Error(result.InternalError))
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("[响应写入失败] %v", err)
	}
}

// decodeBody 解析 JSON body；空 body 视为空对象（对标 express.json）。
func decodeBody(r *http.Request) (map[string]any, error) {
	dec := json.NewDecoder(r.Body)
	dec.UseNumber()
	var raw any
	if err := dec.Decode(&raw); err != nil {
		if errors.Is(err, io.EOF) {
			return map[string]any{}, nil
		}
		return nil, err
	}
	if raw == nil {
		return map[string]any{}, nil
	}
	obj, ok := raw.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("请求体必须是 JSON 对象")
	}
	return obj, nil
}

// jsNumber 模拟 JS Number() 的常用转换：字符串可解析则返回数值。
func jsNumber(value any) (float64, bool) {
	switch v := value.(type) {
	case json.Number:
		f, err := v.Float64()
		return f, err == nil
	case float64:
		return v, true
	case string:
		if strings.TrimSpace(v) == "" {
			return 0, true
		}
		f, err := strconv.ParseFloat(strings.TrimSpace(v), 64)
		return f, err == nil
	case bool:
		if v {
			return 1, true
		}
		return 0, true
	case nil:
		return 0, true
	default:
		return 0, false
	}
}

// jsString 模拟 JS String() 的常用转换。
func jsString(value any) string {
	switch v := value.(type) {
	case nil:
		return ""
	case string:
		return v
	case json.Number:
		return v.String()
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case bool:
		return strconv.FormatBool(v)
	default:
		encoded, err := json.Marshal(v)
		if err != nil {
			return fmt.Sprint(v)
		}
		return string(encoded)
	}
}

// queryInt 模拟 Number(req.query.x || fallback)：空串或非法值回退默认值。
func queryInt(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}
	f, err := strconv.ParseFloat(strings.TrimSpace(raw), 64)
	if err != nil || f == 0 {
		return fallback
	}
	return int(f)
}

// pathID 将路径参数解析为合法 id（对标 Number + Number.isInteger + >0）。
func pathID(raw string) (int64, error) {
	f, err := strconv.ParseFloat(strings.TrimSpace(raw), 64)
	if err != nil || math.IsNaN(f) || math.Trunc(f) != f || f <= 0 {
		return 0, result.NewBusiness(result.BadRequest, "用户 id 不合法")
	}
	return int64(f), nil
}

// sampleTime 当前 UTC 时间，格式 YYYY-MM-DD HH:mm:ss（对标 toISOString().slice(0,19)）。
func sampleTime() string {
	return time.Now().UTC().Format("2006-01-02 15:04:05")
}
