package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const (
	configFileName = "config.json"
)

// Config holds the application configuration
type Config struct {
	BaseURL         string `json:"base_url"`
	TenantName      string `json:"tenant_name"`
	CategoryNo      int    `json:"category_no"`
	CategoryName    string `json:"category_name"`
	AuthType        string `json:"auth_type"` // "basic" or "bearer"
	AuthToken       string `json:"auth_token,omitempty"`
	AdminPassword   string `json:"admin_password,omitempty"` // Full access
	UserPassword    string `json:"user_password,omitempty"`  // Share only access
	IsSetUp         bool   `json:"is_set_up"`
	DefaultArchive  string `json:"default_archive"` // Default archive name for multiple files
}

// GetConfigPath returns the full path to the config file
func GetConfigPath() string {
	// Ensure data directory exists
	os.MkdirAll("data", 0755)
	return filepath.Join("data", configFileName)
}

// LoadConfig loads the configuration from disk
func LoadConfig() (*Config, error) {
	configPath := GetConfigPath()
	
	data, err := os.ReadFile(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			return &Config{}, nil
		}
		return nil, fmt.Errorf("failed to read config: %w", err)
	}

	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}

	return &config, nil
}

// SaveConfig saves the configuration to disk
func (c *Config) SaveConfig() error {
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	configPath := GetConfigPath()
	
	if err := os.WriteFile(configPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write config: %w", err)
	}

	return nil
}

// GetAuthToken retrieves the authentication token from config
func GetAuthToken() (string, error) {
	config, err := LoadConfig()
	if err != nil {
		return "", err
	}
	return config.AuthToken, nil
}

// SetAuthToken stores the authentication token in config
func SetAuthToken(token string) error {
	config, err := LoadConfig()
	if err != nil {
		return err
	}
	config.AuthToken = token
	return config.SaveConfig()
}

// CreateBasicAuthToken creates a Basic auth token from username and password
func CreateBasicAuthToken(username, password string) string {
	credentials := username + ":" + password
	return "Basic " + base64.StdEncoding.EncodeToString([]byte(credentials))
}

// CreateBearerAuthToken creates a Bearer auth token, adding the "Bearer " prefix if not present
func CreateBearerAuthToken(token string) string {
	// Check if token already has "Bearer " prefix (case-insensitive)
	if len(token) > 7 && strings.ToLower(token[:7]) == "bearer " {
		return token
	}
	return "Bearer " + token
}
