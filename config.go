package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/zalando/go-keyring"
)

const (
	appName        = "ThereforeSharer"
	configFileName = "config.json"
	keyringService = "ThereforeSharer"
	keyringUser    = "auth_token"
)

// Config holds the application configuration
type Config struct {
	BaseURL         string `json:"base_url"`
	TenantName      string `json:"tenant_name"`
	CategoryNo      int    `json:"category_no"`
	CategoryName    string `json:"category_name"`
	AuthType        string `json:"auth_type"` // "basic" or "bearer"
	IsSetUp         bool   `json:"is_set_up"`
	DefaultArchive  string `json:"default_archive"` // Default archive name for multiple files
}

// GetConfigDir returns the directory where config is stored
func GetConfigDir() string {
	var configDir string
	switch runtime.GOOS {
	case "darwin":
		home, _ := os.UserHomeDir()
		configDir = filepath.Join(home, "Library", "Application Support", appName)
	case "windows":
		appData := os.Getenv("APPDATA")
		if appData == "" {
			home, _ := os.UserHomeDir()
			configDir = filepath.Join(home, "AppData", "Roaming", appName)
		} else {
			configDir = filepath.Join(appData, appName)
		}
	default: // Linux and others
		configDir = os.Getenv("XDG_CONFIG_HOME")
		if configDir == "" {
			home, _ := os.UserHomeDir()
			configDir = filepath.Join(home, ".config", appName)
		} else {
			configDir = filepath.Join(configDir, appName)
		}
	}
	return configDir
}

// GetConfigPath returns the full path to the config file
func GetConfigPath() string {
	return filepath.Join(GetConfigDir(), configFileName)
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
	configDir := GetConfigDir()
	
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

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

// GetAuthToken retrieves the authentication token from secure storage
func GetAuthToken() (string, error) {
	token, err := keyring.Get(keyringService, keyringUser)
	if err != nil {
		if err == keyring.ErrNotFound {
			return "", nil
		}
		return "", fmt.Errorf("failed to get auth token: %w", err)
	}
	return token, nil
}

// SetAuthToken stores the authentication token in secure storage
func SetAuthToken(token string) error {
	return keyring.Set(keyringService, keyringUser, token)
}

// DeleteAuthToken removes the authentication token from secure storage
func DeleteAuthToken() error {
	return keyring.Delete(keyringService, keyringUser)
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
