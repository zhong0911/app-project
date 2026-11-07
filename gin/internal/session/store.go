// Package session 服务端会话存储（对标 Spring Session）。
//
// token 只留在服务端，前端只拿会话 Cookie；生产多实例请换成 Redis 实现（接口不变）。
package session

import (
	"crypto/rand"
	"encoding/base64"
	"sync"
	"time"
)

// Session 会话内容。
type Session struct {
	UID          string
	Name         string
	AccessToken  string
	RefreshToken string
	// State SSO 授权请求的 state（回调时校验后清空）
	State string
}

type entry struct {
	data     *Session
	expireAt time.Time
}

// Store 内存会话存储。
type Store struct {
	mu       sync.RWMutex
	sessions map[string]*entry
	ttl      time.Duration
}

// NewStore 创建会话存储；ttl 为会话有效期。
func NewStore(ttl time.Duration) *Store {
	store := &Store{sessions: make(map[string]*entry), ttl: ttl}
	go store.gc()
	return store
}

// Create 新建会话，返回会话 ID。
func (s *Store) Create() (string, *Session) {
	id := newID()
	data := &Session{}
	s.mu.Lock()
	s.sessions[id] = &entry{data: data, expireAt: time.Now().Add(s.ttl)}
	s.mu.Unlock()
	return id, data
}

// Get 读取会话（同时刷新过期时间）。
func (s *Store) Get(id string) (*Session, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	item, ok := s.sessions[id]
	if !ok || time.Now().After(item.expireAt) {
		delete(s.sessions, id)
		return nil, false
	}
	item.expireAt = time.Now().Add(s.ttl)
	return item.data, true
}

// Update 在锁内修改会话，避免并发写。
func (s *Store) Update(id string, fn func(*Session)) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if item, ok := s.sessions[id]; ok {
		fn(item.data)
		item.expireAt = time.Now().Add(s.ttl)
	}
}

// Destroy 销毁会话。
func (s *Store) Destroy(id string) {
	s.mu.Lock()
	delete(s.sessions, id)
	s.mu.Unlock()
}

// gc 定期清理过期会话。
func (s *Store) gc() {
	ticker := time.NewTicker(time.Minute)
	for range ticker.C {
		now := time.Now()
		s.mu.Lock()
		for id, item := range s.sessions {
			if now.After(item.expireAt) {
				delete(s.sessions, id)
			}
		}
		s.mu.Unlock()
	}
}

func newID() string {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(buf)
}
