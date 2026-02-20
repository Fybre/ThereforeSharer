package main

import (
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

//go:embed all:frontend/dist
var frontendFS embed.FS

const sessionCookieName = "therefore_sharer_session"

// Simple role-based sessions
const (
	adminSessionVal = "admin-session-secret"
	userSessionVal  = "user-session-secret"
)

func main() {
	r := gin.Default()

	// Enable CORS for frontend development
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://127.0.0.1:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}))

	// ==================== Auth Middlewares ====================
	
	// Middleware to check if ANY valid session exists
	authRequired := func(c *gin.Context) {
		config, _ := LoadConfig()
		if config.AdminPassword == "" {
			c.Next()
			return
		}

		session, err := c.Cookie(sessionCookieName)
		if err != nil || (session != adminSessionVal && session != userSessionVal) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}
		c.Next()
	}

	// Middleware to check if specifically ADMIN session exists
	adminOnly := func(c *gin.Context) {
		session, err := c.Cookie(sessionCookieName)
		if err != nil || session != adminSessionVal {
			c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}

	// ==================== Public Endpoints ====================

	r.GET("/api/status", func(c *gin.Context) {
		config, _ := LoadConfig()
		session, _ := c.Cookie(sessionCookieName)
		
		role := ""
		if session == adminSessionVal {
			role = "admin"
		} else if session == userSessionVal {
			role = "user"
		}

		c.JSON(http.StatusOK, gin.H{
			"isFirstRun":   config.AdminPassword == "",
			"isLoggedIn":   role != "",
			"role":         role,
			"isConfigured": config.IsSetUp,
		})
	})

	r.POST("/api/login", func(c *gin.Context) {
		var req struct {
			Password string `json:"password"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
			return
		}

		config, _ := LoadConfig()

		// Case 1: First run - set the admin password
		if config.AdminPassword == "" {
			if len(req.Password) < 4 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 4 characters"})
				return
			}
			config.AdminPassword = req.Password
			config.SaveConfig()
			c.SetCookie(sessionCookieName, adminSessionVal, 86400, "/", "", false, true)
			c.JSON(http.StatusOK, gin.H{"status": "ok", "role": "admin"})
			return
		}

		// Case 2: Standard login check
		if req.Password == config.AdminPassword {
			c.SetCookie(sessionCookieName, adminSessionVal, 86400, "/", "", false, true)
			c.JSON(http.StatusOK, gin.H{"status": "ok", "role": "admin"})
		} else if config.UserPassword != "" && req.Password == config.UserPassword {
			c.SetCookie(sessionCookieName, userSessionVal, 86400, "/", "", false, true)
			c.JSON(http.StatusOK, gin.H{"status": "ok", "role": "user"})
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "incorrect password"})
		}
	})

	r.POST("/api/logout", func(c *gin.Context) {
		c.SetCookie(sessionCookieName, "", -1, "/", "", false, true)
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// ==================== Protected Endpoints ====================
	api := r.Group("/api")
	api.Use(authRequired)

	// Admin Only Configuration
	api.GET("/config", adminOnly, func(c *gin.Context) {
		config, err := LoadConfig()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		config.AuthToken = ""
		config.AdminPassword = ""
		// UserPassword is okay to show/edit by admin
		c.JSON(http.StatusOK, config)
	})

	api.POST("/config", adminOnly, func(c *gin.Context) {
		var req struct {
			Config
			NewAdminPassword string `json:"new_admin_password"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		existing, _ := LoadConfig()
		newConfig := req.Config
		
		if existing != nil {
			newConfig.AuthToken = existing.AuthToken
			
			// Update Admin Password if provided
			if req.NewAdminPassword != "" {
				newConfig.AdminPassword = req.NewAdminPassword
			} else {
				newConfig.AdminPassword = existing.AdminPassword
			}

			// If user password wasn't provided in the update, keep existing
			if newConfig.UserPassword == "" {
				newConfig.UserPassword = existing.UserPassword
			}
		}

		if err := newConfig.SaveConfig(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api.POST("/auth", adminOnly, func(c *gin.Context) {
		var req struct {
			AuthType string `json:"authType"`
			Username string `json:"username"`
			Password string `json:"password"`
			Token    string `json:"token"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var authToken string
		if req.AuthType == "basic" && req.Username != "" && req.Password != "" {
			authToken = CreateBasicAuthToken(req.Username, req.Password)
		} else if req.AuthType == "bearer" && req.Token != "" {
			authToken = CreateBearerAuthToken(req.Token)
		} else {
			authToken = req.Token
		}

		if err := SetAuthToken(authToken); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Shared Functionality (Users & Admins)
	api.GET("/auth/check", func(c *gin.Context) {
		token, _ := GetAuthToken()
		c.JSON(http.StatusOK, gin.H{"hasStoredCredentials": token != ""})
	})

	api.POST("/categories", func(c *gin.Context) {
		// Category loading should still be restricted to admins or at least checked
		var req struct {
			BaseURL    string `json:"baseURL"`
			TenantName string `json:"tenantName"`
			AuthType   string `json:"authType"`
			Username   string `json:"username"`
			Password   string `json:"password"`
			Token      string `json:"token"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var authToken string
		if req.AuthType == "basic" && req.Username != "" && req.Password != "" {
			authToken = CreateBasicAuthToken(req.Username, req.Password)
		} else if req.AuthType == "bearer" && req.Token != "" {
			authToken = CreateBearerAuthToken(req.Token)
		} else {
			authToken = req.Token
		}

		if authToken == "" {
			storedToken, _ := GetAuthToken()
			authToken = storedToken
		}

		client := NewThereforeAPIClient(req.BaseURL, req.TenantName, authToken)
		treeViews, err := client.GetCategoriesTree()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		categories := FindCategoriesWithPath(treeViews, "")
		var result []gin.H
		for _, cat := range categories {
			result = append(result, gin.H{"objNo": cat.ItemNo, "caption": cat.Path})
		}
		c.JSON(http.StatusOK, result)
	})

	api.POST("/share", func(c *gin.Context) {
		form, err := c.MultipartForm()
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		files := form.File["files"]
		password := c.PostForm("password")
		expiryDays, _ := strconv.Atoi(c.PostForm("expiryDays"))
		customExpiry := c.PostForm("customExpiry")

		config, _ := LoadConfig()
		token, _ := GetAuthToken()
		client := NewThereforeAPIClient(config.BaseURL, config.TenantName, token)

		tempDir, _ := os.MkdirTemp("", "therefore-*")
		defer os.RemoveAll(tempDir)

		var tempPaths []string
		for _, f := range files {
			p := filepath.Join(tempDir, f.Filename)
			c.SaveUploadedFile(f, p)
			tempPaths = append(tempPaths, p)
		}

		var fileData []byte
		if len(tempPaths) == 1 && strings.EqualFold(filepath.Ext(tempPaths[0]), ".zip") {
			fileData, _ = os.ReadFile(tempPaths[0])
		} else {
			fileData, _ = CreateZipArchive(tempPaths)
		}

		fileName := GetFileNameForUpload(tempPaths, config.DefaultArchive)
		docResp, err := client.CreateDocument(config.CategoryNo, fileName, fileData, []IndexDataItem{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		var expiryTime *time.Time
		if expiryDays > 0 {
			t := time.Now().AddDate(0, 0, expiryDays)
			expiryTime = &t
		} else if expiryDays == -1 {
			t, _ := time.Parse(time.RFC3339, customExpiry)
			expiryTime = &t
		}

		linkResp, err := client.CreateSharedLink(docResp.DocNo, password, expiryTime, fileName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"url": linkResp.URL, "docNo": docResp.DocNo})
	})

	api.GET("/history", func(c *gin.Context) {
		config, _ := LoadConfig()
		token, _ := GetAuthToken()
		client := NewThereforeAPIClient(config.BaseURL, config.TenantName, token)
		entries, err := client.GetSharedLinksSharedByMe()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, entries)
	})

	// Serve static files from embedded FS
	staticFS, _ := fs.Sub(frontendFS, "frontend/dist")
	staticHandler := http.FileServer(http.FS(staticFS))

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api") {
			c.JSON(http.StatusNotFound, gin.H{"error": "API route not found"})
			return
		}

		// Try to serve static file
		f, err := staticFS.Open(strings.TrimPrefix(path, "/"))
		if err == nil {
			f.Close()
			staticHandler.ServeHTTP(c.Writer, c.Request)
			return
		}

		// Fallback to index.html for SPA
		c.FileFromFS("/", http.FS(staticFS))
	})

	fmt.Println("Web Server (Single Binary) running on http://localhost:8080")
	r.Run(":8080")
}
