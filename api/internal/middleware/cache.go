package middleware

import "net/http"

// CacheControl sets Cache-Control headers for GET requests.
// Data refreshes daily at 6 AM, so 5-minute max-age is appropriate.
func CacheControl(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			w.Header().Set("Cache-Control", "public, max-age=300")
		}
		next.ServeHTTP(w, r)
	})
}
