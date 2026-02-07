package main

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// CreateZipArchive creates a ZIP archive containing the provided files
// Returns the bytes of the ZIP file
func CreateZipArchive(filePaths []string) ([]byte, error) {
	if len(filePaths) == 0 {
		return nil, fmt.Errorf("no files provided")
	}

	// Always create ZIP - even for single files
	// This avoids file extension blocking issues
	var buf bytes.Buffer
	zipWriter := zip.NewWriter(&buf)

	for _, filePath := range filePaths {
		if err := addFileToZip(zipWriter, filePath); err != nil {
			zipWriter.Close()
			return nil, fmt.Errorf("failed to add %s to zip: %w", filePath, err)
		}
	}

	if err := zipWriter.Close(); err != nil {
		return nil, fmt.Errorf("failed to close zip writer: %w", err)
	}

	return buf.Bytes(), nil
}

// addFileToZip adds a single file to the ZIP archive
func addFileToZip(zipWriter *zip.Writer, filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return err
	}

	// Skip directories
	if info.IsDir() {
		return nil
	}

	// Create zip header
	header, err := zip.FileInfoHeader(info)
	if err != nil {
		return err
	}
	
	// Use just the filename, not the full path
	header.Name = filepath.Base(filePath)
	header.Method = zip.Deflate

	writer, err := zipWriter.CreateHeader(header)
	if err != nil {
		return err
	}

	_, err = io.Copy(writer, file)
	return err
}

// GetFileNameForUpload determines the filename to use for upload
// For single files, uses the original filename with .zip extension
// For multiple files, uses defaultArchiveName with timestamp and .zip extension
func GetFileNameForUpload(filePaths []string, defaultArchiveName string) string {
	if len(filePaths) == 1 {
		baseName := filepath.Base(filePaths[0])
		ext := filepath.Ext(baseName)
		// If already a .zip, keep the original filename
		if strings.EqualFold(ext, ".zip") {
			return baseName
		}
		// Otherwise use original filename base with .zip extension
		nameWithoutExt := baseName[:len(baseName)-len(ext)]
		return nameWithoutExt + ".zip"
	}

	// For multiple files, use configured archive name with timestamp
	if defaultArchiveName == "" {
		defaultArchiveName = "Archive"
	}

	// Format: ArchiveName-yymmdd-hhmm.zip
	timestamp := time.Now().Format("060102-1504") // yymmdd-hhmm
	return fmt.Sprintf("%s-%s.zip", defaultArchiveName, timestamp)
}

// ValidateFiles checks if all provided file paths exist and are readable
func ValidateFiles(filePaths []string) error {
	var totalSize int64
	for _, path := range filePaths {
		info, err := os.Stat(path)
		if err != nil {
			if os.IsNotExist(err) {
				return fmt.Errorf("file does not exist: %s", path)
			}
			return fmt.Errorf("cannot access file %s: %w", path, err)
		}
		if info.IsDir() {
			return fmt.Errorf("directories not supported: %s", path)
		}
		totalSize += info.Size()
	}

	// Note: Large files (over 100MB) may take a while to upload

	return nil
}
