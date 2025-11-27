// handlers/middleware.go
package handlers

import (
	"log"
	"net/http"
)

// CORSMiddleware добавляет CORS заголовки ко всем ответам
func CORSMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next(w, r)
	}
}

// LoggingMiddleware логирует входящие запросы
func LoggingMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Printf("🌐 %s %s %s", r.Method, r.URL.Path, r.RemoteAddr)
		next(w, r)
	}
}

// StandardMiddlewareChain создает стандартную цепочку middleware
func StandardMiddlewareChain(handler http.HandlerFunc) http.Handler {
	return LoggingMiddleware(
		CORSMiddleware(
			handler, // ← убрали POSTOnlyMiddleware, теперь разрешены все методы
		),
	)
}