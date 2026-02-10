package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx          context.Context
	cancelUpload context.CancelFunc
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// ==================== Configuration Methods ====================

// GetConfig retrieves the current configuration
func (a *App) GetConfig() (*Config, error) {
	return LoadConfig()
}

// SaveConfig saves the configuration
func (a *App) SaveConfig(config *Config) error {
	return config.SaveConfig()
}

// SetAuthCredentials saves authentication credentials
func (a *App) SetAuthCredentials(authType, username, password, token string) error {
	var authToken string
	if authType == "basic" && username != "" && password != "" {
		authToken = CreateBasicAuthToken(username, password)
	} else if authType == "bearer" && token != "" {
		authToken = CreateBearerAuthToken(token)
	} else {
		authToken = token
	}

	if authToken == "" {
		return fmt.Errorf("no authentication token provided")
	}

	return SetAuthToken(authToken)
}

// ==================== Category Selection ====================

// TestConnectionRequest represents a request to test connection or get categories
type TestConnectionRequest struct {
	BaseURL    string `json:"baseURL"`
	TenantName string `json:"tenantName"`
	AuthType   string `json:"authType"`
	Username   string `json:"username"`
	Password   string `json:"password"`
	Token      string `json:"token"`
}

// CategoryInfo represents a category for selection
type CategoryInfo struct {
	ObjNo   int    `json:"objNo"`
	Caption string `json:"caption"`
	Path    string `json:"path"`
}

// GetCategories retrieves all available categories from Therefore
func (a *App) GetCategories(req TestConnectionRequest) ([]CategoryInfo, error) {
	var authToken string
	if req.AuthType == "basic" && req.Username != "" && req.Password != "" {
		authToken = CreateBasicAuthToken(req.Username, req.Password)
	} else if req.AuthType == "bearer" && req.Token != "" {
		authToken = CreateBearerAuthToken(req.Token)
	} else {
		authToken = req.Token
	}

	// If no credentials in request, try stored credentials
	if authToken == "" {
		storedToken, err := GetAuthToken()
		if err != nil || storedToken == "" {
			return nil, fmt.Errorf("no authentication credentials provided")
		}
		authToken = storedToken
	}

	client := NewThereforeAPIClient(req.BaseURL, req.TenantName, authToken)
	
	treeViews, err := client.GetCategoriesTree()
	if err != nil {
		return nil, fmt.Errorf("API error: %w", err)
	}
	
	categories := FindCategoriesWithPath(treeViews, "")
	
	if len(categories) == 0 {
		return []CategoryInfo{}, nil
	}
	
	var result []CategoryInfo
	for _, cat := range categories {
		result = append(result, CategoryInfo{
			ObjNo:   cat.ItemNo,
			Caption: cat.Path,
		})
	}
	
	return result, nil
}

// ==================== File Sharing ====================

// ShareRequest represents a request to share files
type ShareRequest struct {
	Files       []string `json:"files"`       // Full paths to files
	Password    string   `json:"password"`    // Optional password
	ExpiryDays  int      `json:"expiryDays"`  // 0 = never, 7, 30, 90, or -1 for custom
	CustomExpiry string  `json:"customExpiry"` // ISO 8601 date if expiryDays = -1
}

// ShareResponse represents the result of a share operation
type ShareResponse struct {
	URL        string `json:"url"`
	DocNo      int64  `json:"docNo"`
	ExpiresAt  string `json:"expiresAt,omitempty"`
}

// ShareFiles uploads files to Therefore and creates a shared link
func (a *App) ShareFiles(req ShareRequest) (*ShareResponse, error) {
	// Create cancellable context
	uploadCtx, cancel := context.WithCancel(a.ctx)
	a.cancelUpload = cancel
	defer func() {
		a.cancelUpload = nil
	}()

	// Validate files
	if err := ValidateFiles(req.Files); err != nil {
		return nil, fmt.Errorf("file validation failed: %w", err)
	}

	// Get authenticated client and config
	client, config, err := a.getAuthenticatedClient()
	if err != nil {
		return nil, err
	}

	// Read or create ZIP archive
	var fileData []byte
	if len(req.Files) == 1 && strings.EqualFold(filepath.Ext(req.Files[0]), ".zip") {
		// Single zip file - read it directly without re-zipping
		fileData, err = os.ReadFile(req.Files[0])
		if err != nil {
			return nil, fmt.Errorf("failed to read file: %w", err)
		}
	} else {
		fileData, err = CreateZipArchive(req.Files)
		if err != nil {
			return nil, fmt.Errorf("failed to create archive: %w", err)
		}
	}

	// Check if cancelled
	if uploadCtx.Err() != nil {
		return nil, fmt.Errorf("upload cancelled")
	}

	// Determine filename
	fileName := GetFileNameForUpload(req.Files, config.DefaultArchive)

	// Create document with progress tracking
	docResp, err := client.CreateDocumentWithProgress(uploadCtx, config.CategoryNo, fileName, fileData, []IndexDataItem{})
	if err != nil {
		return nil, fmt.Errorf("failed to upload document: %w", err)
	}
	
	// Calculate expiry
	var expiryTime *time.Time
	if req.ExpiryDays > 0 {
		t := time.Now().AddDate(0, 0, req.ExpiryDays)
		expiryTime = &t
	} else if req.ExpiryDays == -1 && req.CustomExpiry != "" {
		t, err := time.Parse(time.RFC3339, req.CustomExpiry)
		if err == nil {
			expiryTime = &t
		}
	}
	
	// Create shared link
	linkResp, err := client.CreateSharedLink(docResp.DocNo, req.Password, expiryTime, fileName)
	if err != nil {
		return nil, fmt.Errorf("failed to create shared link: %w", err)
	}
	
	resp := &ShareResponse{
		URL:   linkResp.URL,
		DocNo: docResp.DocNo,
	}
	
	if expiryTime != nil {
		resp.ExpiresAt = expiryTime.Format(time.RFC3339)
	}
	
	return resp, nil
}

// ==================== Utilities ====================

// getAuthenticatedClient creates an authenticated API client
func (a *App) getAuthenticatedClient() (*ThereforeAPIClient, *Config, error) {
	config, err := LoadConfig()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to load config: %w", err)
	}

	if !config.IsSetUp {
		return nil, nil, fmt.Errorf("application not configured")
	}

	token, err := GetAuthToken()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get auth token: %w", err)
	}

	if token == "" {
		return nil, nil, fmt.Errorf("no authentication token found")
	}

	client := NewThereforeAPIClient(config.BaseURL, config.TenantName, token)
	return client, config, nil
}

// ShareHistoryEntry represents a single share history entry
type ShareHistoryEntry struct {
	Filename     string `json:"filename"`
	URL          string `json:"url"`
	LinkID       string `json:"linkId"`
	DocNo        int64  `json:"docNo"`
	CreatedAt    string `json:"createdAt"`
	ExpiresAt    string `json:"expiresAt"`
	HasPassword  bool   `json:"hasPassword"`
	CategoryName string `json:"categoryName"`
}

// GetShareHistory retrieves the share history for the current user
func (a *App) GetShareHistory() ([]ShareHistoryEntry, error) {
	client, _, err := a.getAuthenticatedClient()
	if err != nil {
		return nil, err
	}

	entries, err := client.GetSharedLinksSharedByMe()
	if err != nil {
		return nil, err
	}

	// Convert to our format - initialize with empty slice to ensure JSON returns [] not null
	result := make([]ShareHistoryEntry, 0)
	for _, entry := range entries {
		result = append(result, ShareHistoryEntry{
			Filename:     entry.SharedLink.Filename,
			URL:          entry.SharedLink.LinkURL,
			LinkID:       entry.SharedLink.LinkID,
			DocNo:        entry.SharedLink.DocNo,
			CreatedAt:    entry.SharedLink.CreatedAt,
			ExpiresAt:    entry.SharedLink.ExpiresAt,
			HasPassword:  entry.SharedLink.IsPasswordProtected,
			CategoryName: entry.CategoryName,
		})
	}

	return result, nil
}

// RevokeSharedLink revokes a shared link
func (a *App) RevokeSharedLink(linkID string) error {
	client, _, err := a.getAuthenticatedClient()
	if err != nil {
		return err
	}

	return client.RevokeSharedLink(linkID)
}

// DeleteDocument deletes a document from Therefore
func (a *App) DeleteDocument(docNo int64) error {
	client, _, err := a.getAuthenticatedClient()
	if err != nil {
		return err
	}

	return client.DeleteDocument(docNo)
}

// CopyToClipboard copies text to the system clipboard
func (a *App) CopyToClipboard(text string) error {
	return runtime.ClipboardSetText(a.ctx, text)
}

// OpenFileDialog opens a native file browser dialog
func (a *App) OpenFileDialog() (string, error) {
	return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select File to Share",
	})
}

// HasStoredCredentials checks if auth credentials are stored
func (a *App) HasStoredCredentials() bool {
	token, err := GetAuthToken()
	if err != nil {
		return false
	}
	return token != ""
}

// FileInfo represents file metadata for the frontend
type FileInfo struct {
	Name string `json:"name"`
	Path string `json:"path"`
	Size int64  `json:"size"`
}

// GetFileInfo returns metadata about a file
func (a *App) GetFileInfo(path string) (*FileInfo, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	return &FileInfo{
		Name: filepath.Base(path),
		Path: path,
		Size: info.Size(),
	}, nil
}

// CancelUpload cancels an ongoing upload
func (a *App) CancelUpload() {
	if a.cancelUpload != nil {
		a.cancelUpload()
	}
}
