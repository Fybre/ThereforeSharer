package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"time"
)

// ThereforeAPIClient handles all API communication with
type ThereforeAPIClient struct {
	BaseURL       string
	TenantName    string
	AuthToken     string
	HTTPClient    *http.Client
	UploadTimeout time.Duration
}

// NewThereforeAPIClient creates a new API client
func NewThereforeAPIClient(baseURL, tenantName, authToken string) *ThereforeAPIClient {
	return &ThereforeAPIClient{
		BaseURL:       baseURL,
		TenantName:    tenantName,
		AuthToken:     authToken,
		HTTPClient:    &http.Client{Timeout: 5 * time.Minute},
		UploadTimeout: 30 * time.Minute,
	}
}

// Use a separate total budget for document creation without changing ordinary
// API requests or mutating the shared client. The request context still cancels it.
func (c *ThereforeAPIClient) clientForRequest(endpoint string) *http.Client {
	if endpoint != "CreateDocument" || c.UploadTimeout <= 0 {
		return c.HTTPClient
	}
	client := *c.HTTPClient
	client.Timeout = c.UploadTimeout
	return &client
}

type uncertainUploadError struct{ cause error }

func (e *uncertainUploadError) Error() string {
	return "The upload timed out before Therefore confirmed document creation. The document may already exist. Check the sharing category in Therefore before trying again to avoid creating a duplicate."
}
func (e *uncertainUploadError) Unwrap() error { return e.cause }

func requestError(endpoint string, err error) error {
	var netErr net.Error
	if endpoint == "CreateDocument" && (errors.Is(err, context.DeadlineExceeded) || (errors.As(err, &netErr) && netErr.Timeout())) {
		return &uncertainUploadError{cause: err}
	}
	return fmt.Errorf("request failed: %w", err)
}

// makeRequest sends an ordinary JSON request.
func (c *ThereforeAPIClient) makeRequest(method, endpoint string, body []byte) ([]byte, error) {
	return c.makeRequestContext(context.Background(), method, endpoint, bytes.NewReader(body), "application/json; charset=utf-8", nil)
}

// Every session, chunk and finalisation request shares the caller's cancellation.
func (c *ThereforeAPIClient) makeRequestContext(ctx context.Context, method, endpoint string, body io.Reader, contentType string, headers map[string]string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+"/theservice/v0001/restun/"+endpoint, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", c.AuthToken)
	req.Header.Set("TenantName", c.TenantName)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Accept", "application/json")
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	resp, err := c.clientForRequest(endpoint).Do(req)
	if err != nil {
		if errors.Is(ctx.Err(), context.Canceled) {
			return nil, fmt.Errorf("upload cancelled: %w", ctx.Err())
		}
		return nil, requestError(endpoint, err)
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return nil, requestError(endpoint, err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		switch resp.StatusCode {
		case 401:
			return nil, fmt.Errorf("authentication failed - check your credentials in Settings")
		case 403:
			return nil, fmt.Errorf("permission denied - check your Therefore permissions for this category")
		case 404:
			return nil, fmt.Errorf("resource not found - the category, document or upload operation may be unavailable")
		default:
			return nil, fmt.Errorf("%s failed (HTTP %d)", endpoint, resp.StatusCode)
		}
	}
	return data, nil
}

// TestConnection tests the connection by calling GetSystemCustomerId
func (c *ThereforeAPIClient) TestConnection() error {
	_, err := c.makeRequest("GET", "help/operations/GetSystemCustomerId", nil)
	return err
}

// TreeViewNode represents a node in the tree view
type TreeViewNode struct {
	ItemNo     int            `json:"ItemNo"`
	ItemType   int            `json:"ItemType"` // 2 = Category
	Name       string         `json:"Name"`
	ChildItems []TreeViewNode `json:"ChildItems,omitempty"`
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
	CategoryNo         int                 `json:"CategoryNo"`
	FileUploadSessions []FileUploadSession `json:"FileUploadSessions"`
	IndexData          []IndexDataItem     `json:"IndexDataItems"`
}

type FileUploadSession struct {
	FileName        string `json:"FileName"`
	UploadSessionID string `json:"UploadSessionId"`
}

// IndexDataItem represents an index data field
type IndexDataItem map[string]json.RawMessage

type StringIndexData struct {
	FieldNo   int    `json:"FieldNo"`
	DataValue string `json:"DataValue"`
}

// CreateDocumentResponse represents the response from CreateDocument
type CreateDocumentResponse struct {
	DocNo                 int64  `json:"DocNo"`
	LastChangeTime        string `json:"LastChangeTime"`
	VersionNo             int    `json:"VersionNo"`
	LastChangeTimeISO8601 string `json:"LastChangeTimeISO8601"`
}

// CreateDocument is a convenience wrapper for callers with an in-memory file.
// Desktop and web uploads use CreateDocumentFromReader to stream from disk.
func (c *ThereforeAPIClient) CreateDocument(categoryNo int, fileName string, fileData []byte, indexData []IndexDataItem) (*CreateDocumentResponse, error) {
	return c.CreateDocumentFromReader(context.Background(), categoryNo, fileName, bytes.NewReader(fileData), int64(len(fileData)), indexData, nil)
}

// CreateSharedLinkRequest represents the request to create a shared link
type CreateSharedLinkRequest struct {
	DocNo          int64  `json:"DocNo"`
	Password       string `json:"Password,omitempty"`
	Expire         string `json:"Expire,omitempty"` // ISO 8601 date or empty
	PermissionType int    `json:"PermissionType"`   // Required: 1=ReadOnly, 2=Edit
	ShareType      int    `json:"ShareType"`        // Required: 0=Organization, 1=SpecificPeople, 2=Public
	FileFormat     int    `json:"FileFormat"`       // Optional: 0=PDF, 1=Original
	Filename       string `json:"Filename"`         // Optional: filename for download
}

// CreateSharedLinkResponse represents the response from CreateSharedLink
type CreateSharedLinkResponse struct {
	LinkID       string `json:"LinkID"`
	SharedLinkNo int64  `json:"SharedLinkNo"`
	URL          string `json:"LinkUrl"`
}

// SharedLinkViewEntry represents a shared link entry from the history
type SharedLinkViewEntry struct {
	Description   string         `json:"Description"`
	CategoryName  string         `json:"CategoryName"`
	DocumentTitle string         `json:"DocumentTitle"`
	SharedLink    SharedLinkInfo `json:"SharedLink"`
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
		Finished              bool                  `json:"Finished"`
		QueryID               int                   `json:"QueryId"`
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
