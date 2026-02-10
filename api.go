package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// ThereforeAPIClient handles all API communication with
type ThereforeAPIClient struct {
	BaseURL    string
	TenantName string
	AuthToken  string
	HTTPClient *http.Client
}

// NewThereforeAPIClient creates a new API client
func NewThereforeAPIClient(baseURL, tenantName, authToken string) *ThereforeAPIClient {
	return &ThereforeAPIClient{
		BaseURL:    baseURL,
		TenantName: tenantName,
		AuthToken:  authToken,
		HTTPClient: &http.Client{Timeout: 5 * time.Minute}, // Increased for large file uploads
	}
}

// makeRequest performs an HTTP request with authentication
func (c *ThereforeAPIClient) makeRequest(method, endpoint string, body []byte) ([]byte, error) {
	url := c.BaseURL + "/theservice/v0001/restun/" + endpoint

	var bodyReader io.Reader
	if body != nil {
		bodyReader = bytes.NewReader(body)
	}

	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Authorization", c.AuthToken)
	req.Header.Set("TenantName", c.TenantName)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		// Parse common error scenarios to provide helpful messages
		bodyStr := string(respBody)
		switch resp.StatusCode {
		case 401:
			return nil, fmt.Errorf("authentication failed - please check your credentials in settings")
		case 403:
			return nil, fmt.Errorf("permission denied - you don't have rights to perform this action. Check your Therefore permissions for this category")
		case 404:
			return nil, fmt.Errorf("resource not found - the category or document may have been deleted")
		case 500, 502, 503:
			return nil, fmt.Errorf("Therefore server error - please try again later or contact your administrator")
		default:
			// For other errors, show the status code and response
			return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, bodyStr)
		}
	}

	return respBody, nil
}

// makeRequestWithProgress performs an HTTP request with progress tracking
func (c *ThereforeAPIClient) makeRequestWithProgress(ctx context.Context, method, endpoint string, body []byte) ([]byte, error) {
	url := c.BaseURL + "/theservice/v0001/restun/" + endpoint

	var bodyReader io.Reader
	if body != nil {
		// Wrap the body reader with progress tracking
		progressReader := NewProgressReader(ctx, bytes.NewReader(body), int64(len(body)))
		bodyReader = progressReader
	}

	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add context to request for cancellation support
	req = req.WithContext(ctx)

	// Set headers
	req.Header.Set("Authorization", c.AuthToken)
	req.Header.Set("TenantName", c.TenantName)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	// Important: Set Content-Length explicitly when using custom reader
	req.ContentLength = int64(len(body))

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		// Check if error was due to context cancellation
		if ctx.Err() == context.Canceled {
			return nil, fmt.Errorf("upload cancelled")
		}
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		// Parse common error scenarios to provide helpful messages
		bodyStr := string(respBody)
		switch resp.StatusCode {
		case 401:
			return nil, fmt.Errorf("authentication failed - please check your credentials in settings")
		case 403:
			return nil, fmt.Errorf("permission denied - you don't have rights to perform this action. Check your Therefore permissions for this category")
		case 404:
			return nil, fmt.Errorf("resource not found - the category or document may have been deleted")
		case 500, 502, 503:
			return nil, fmt.Errorf("Therefore server error - please try again later or contact your administrator")
		default:
			// For other errors, show the status code and response
			return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, bodyStr)
		}
	}

	return respBody, nil
}

// TestConnection tests the connection by calling GetSystemCustomerId
func (c *ThereforeAPIClient) TestConnection() error {
	_, err := c.makeRequest("GET", "help/operations/GetSystemCustomerId", nil)
	return err
}

// TreeViewNode represents a node in the tree view
type TreeViewNode struct {
	ItemNo      int    `json:"ItemNo"`
	ItemType    int    `json:"ItemType"` // 2 = Category
	Name        string `json:"Name"`
	ChildItems  []TreeViewNode `json:"ChildItems,omitempty"`
}

// CategoryWithPath represents a category with its full path
type CategoryWithPath struct {
	ItemNo int    `json:"itemNo"`
	Name   string `json:"name"`
	Path   string `json:"path"`
}

// GetCategoriesTree retrieves all categories tree
func (c *ThereforeAPIClient) GetCategoriesTree() ([]TreeViewNode, error) {
	// GetCategoriesTree - using empty payload to match Therefore web client behavior
	reqBody := `{}`
	data, err := c.makeRequest("POST", "GetCategoriesTree", []byte(reqBody))
	if err != nil {
		return nil, err
	}

	var result struct {
		TreeItems []TreeViewNode `json:"TreeItems"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse tree items: %w", err)
	}

	return result.TreeItems, nil
}

// FindCategoriesWithPath extracts all categories with their full paths
func FindCategoriesWithPath(nodes []TreeViewNode, parentPath string) []CategoryWithPath {
	var categories []CategoryWithPath
	for _, node := range nodes {
		currentPath := node.Name
		if parentPath != "" {
			currentPath = parentPath + " / " + node.Name
		}
		
		if node.ItemType == 2 { // 2 = Category
			categories = append(categories, CategoryWithPath{
				ItemNo: node.ItemNo,
				Name:   node.Name,
				Path:   currentPath,
			})
		}
		
		if len(node.ChildItems) > 0 {
			categories = append(categories, FindCategoriesWithPath(node.ChildItems, currentPath)...)
		}
	}
	return categories
}

// CreateDocumentRequest represents the request to create a document
type CreateDocumentRequest struct {
	CategoryNo int                 `json:"CategoryNo"`
	Streams    []StreamInfo        `json:"Streams"`
	IndexData  []IndexDataItem     `json:"IndexData"`
}

// StreamInfo represents a file stream
type StreamInfo struct {
	FileName           string `json:"FileName"`
	FileDataBase64JSON string `json:"FileDataBase64JSON"`
}

// IndexDataItem represents an index data field
type IndexDataItem struct {
	FieldNo   int    `json:"FieldNo"`
	FieldName string `json:"FieldName,omitempty"`
	Value     string `json:"Value"`
}

// CreateDocumentResponse represents the response from CreateDocument
type CreateDocumentResponse struct {
	DocNo                 int64  `json:"DocNo"`
	LastChangeTime        string `json:"LastChangeTime"`
	VersionNo             int    `json:"VersionNo"`
	LastChangeTimeISO8601 string `json:"LastChangeTimeISO8601"`
}

// CreateDocument creates a new document in Therefore
func (c *ThereforeAPIClient) CreateDocument(categoryNo int, fileName string, fileData []byte, indexData []IndexDataItem) (*CreateDocumentResponse, error) {
	return c.CreateDocumentWithProgress(nil, categoryNo, fileName, fileData, indexData)
}

// CreateDocumentWithProgress creates a new document in Therefore with progress tracking
func (c *ThereforeAPIClient) CreateDocumentWithProgress(ctx context.Context, categoryNo int, fileName string, fileData []byte, indexData []IndexDataItem) (*CreateDocumentResponse, error) {
	req := CreateDocumentRequest{
		CategoryNo: categoryNo,
		Streams: []StreamInfo{
			{
				FileName:           fileName,
				FileDataBase64JSON: base64.StdEncoding.EncodeToString(fileData),
			},
		},
		IndexData: indexData,
	}

	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Use progress-aware request if context provided
	var data []byte
	if ctx != nil {
		data, err = c.makeRequestWithProgress(ctx, "POST", "CreateDocument", reqBody)
	} else {
		data, err = c.makeRequest("POST", "CreateDocument", reqBody)
	}
	if err != nil {
		return nil, err
	}

	// Try parsing as direct response (fields at root level)
	var directResp CreateDocumentResponse
	if err := json.Unmarshal(data, &directResp); err == nil && directResp.DocNo > 0 {
		return &directResp, nil
	}

	// Try parsing with wrapper
	var result struct {
		CreateDocumentResult CreateDocumentResponse `json:"CreateDocumentResult"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse create document response: %w", err)
	}

	return &result.CreateDocumentResult, nil
}

// CreateSharedLinkRequest represents the request to create a shared link
type CreateSharedLinkRequest struct {
	DocNo          int64  `json:"DocNo"`
	Password       string `json:"Password,omitempty"`
	Expire         string `json:"Expire,omitempty"` // ISO 8601 date or empty
	PermissionType int    `json:"PermissionType"`  // Required: 1=ReadOnly, 2=Edit
	ShareType      int    `json:"ShareType"`       // Required: 0=Organization, 1=SpecificPeople, 2=Public
	FileFormat     int    `json:"FileFormat"`      // Optional: 0=PDF, 1=Original
	Filename       string `json:"Filename"`        // Optional: filename for download
}

// CreateSharedLinkResponse represents the response from CreateSharedLink
type CreateSharedLinkResponse struct {
	LinkID       string `json:"LinkID"`
	SharedLinkNo int64  `json:"SharedLinkNo"`
	URL          string `json:"LinkUrl"`
}

// SharedLinkViewEntry represents a shared link entry from the history
type SharedLinkViewEntry struct {
	CategoryName    string `json:"CategoryName"`
	DocumentTitle   string `json:"DocumentTitle"`
	SharedLink      SharedLinkInfo `json:"SharedLink"`
}

// SharedLinkInfo contains the shared link details
type SharedLinkInfo struct {
	CreatedAt            string `json:"CreatedAt"`
	CreatedBy            int    `json:"CreatedBy"`
	CreatedByUserDisplay string `json:"CreatedByUserDisplay"`
	DocNo                int64  `json:"DocNo"`
	ExpiresAt            string `json:"ExpiresAt"`
	Filename             string `json:"Filename"`
	LinkID               string `json:"LinkId"`
	LinkURL              string `json:"LinkUrl"`
	PermissionType       int    `json:"PermissionType"`
	ShareType            int    `json:"ShareType"`
	IsPasswordProtected  bool   `json:"IsPasswordProtected"`
	FileFormat           int    `json:"FileFormat"`
}

// GetSharedLinksSharedByMe retrieves all shared links created by the current user
func (c *ThereforeAPIClient) GetSharedLinksSharedByMe() ([]SharedLinkViewEntry, error) {
	reqBody := `{"QueryId":0}`
	
	data, err := c.makeRequest("POST", "GetSharedLinksSharedByMe", []byte(reqBody))
	if err != nil {
		return nil, err
	}
	
	var result struct {
		Finished             bool                  `json:"Finished"`
		QueryID              int                   `json:"QueryId"`
		SharedLinkViewEntries []SharedLinkViewEntry `json:"SharedLinkViewEntries"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse shared links response: %w", err)
	}
	
	return result.SharedLinkViewEntries, nil
}

// RevokeSharedLink revokes a shared link
func (c *ThereforeAPIClient) RevokeSharedLink(linkID string) error {
	reqBody := fmt.Sprintf(`{"LinkId":"%s"}`, linkID)
	
	_, err := c.makeRequest("POST", "RevokeSharedLink", []byte(reqBody))
	if err != nil {
		return err
	}
	
	return nil
}

// DeleteDocument deletes a document from Therefore
func (c *ThereforeAPIClient) DeleteDocument(docNo int64) error {
	reqBody := fmt.Sprintf(`{"DocNo":%d}`, docNo)
	
	_, err := c.makeRequest("POST", "DeleteDocument", []byte(reqBody))
	if err != nil {
		return err
	}
	
	return nil
}

// CreateSharedLink creates a shared link for a document
func (c *ThereforeAPIClient) CreateSharedLink(docNo int64, password string, expireTime *time.Time, filename string) (*CreateSharedLinkResponse, error) {
	req := CreateSharedLinkRequest{
		DocNo:          docNo,
		Password:       password,
		PermissionType: 1, // 1 = ReadOnly
		ShareType:      2, // 2 = Public
		FileFormat:     1, // 1 = Original
		Filename:       filename,
	}
	
	if expireTime != nil {
		req.Expire = expireTime.Format(time.RFC3339)
	}

	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	data, err := c.makeRequest("POST", "CreateSharedLink", reqBody)
	if err != nil {
		return nil, err
	}

	// Parse the wrapper structure
	var result struct {
		SharedLink CreateSharedLinkResponse `json:"SharedLink"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse create shared link response: %w", err)
	}

	return &result.SharedLink, nil
}
