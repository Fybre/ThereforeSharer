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
// and directories. Directories are added recursively, keeping their
// structure under the directory's own name.
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
		if err := addPathToZip(zipWriter, filePath); err != nil {
			zipWriter.Close()
			return nil, fmt.Errorf("failed to add %s to zip: %w", filePath, err)
		}
	}

	if err := zipWriter.Close(); err != nil {
		return nil, fmt.Errorf("failed to close zip writer: %w", err)
	}

	return buf.Bytes(), nil
}

// addPathToZip adds a file, or a directory and everything under it, to the
// ZIP archive. Entry names are relative to the path's parent directory.
func addPathToZip(zipWriter *zip.Writer, root string) error {
	root = filepath.Clean(root)
	parent := filepath.Dir(root)

	return filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		rel, err := filepath.Rel(parent, path)
		if err != nil {
			return err
		}
		name := filepath.ToSlash(rel)

		if info.IsDir() {
			// Add an explicit entry so empty directories are preserved
			_, err := zipWriter.Create(name + "/")
			return err
		}

		// Skip symlinks, sockets, etc.
		if !info.Mode().IsRegular() {
			return nil
		}

		return addFileToZip(zipWriter, path, name, info)
	})
}

// addFileToZip adds a single file to the ZIP archive under the given name
func addFileToZip(zipWriter *zip.Writer, filePath, name string, info os.FileInfo) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	// Create zip header
	header, err := zip.FileInfoHeader(info)
	if err != nil {
		return err
	}

	header.Name = name
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
		// Folder names may contain dots, so don't treat them as extensions
		if info, err := os.Stat(filePaths[0]); err == nil && info.IsDir() {
			return baseName + ".zip"
		}
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

// ValidateFiles checks if all provided file and directory paths exist and are readable
func ValidateFiles(filePaths []string) error {
	for _, path := range filePaths {
		if _, err := os.Stat(path); err != nil {
			if os.IsNotExist(err) {
				return fmt.Errorf("file does not exist: %s", path)
			}
			return fmt.Errorf("cannot access file %s: %w", path, err)
		}
	}

	// Note: Large files (over 100MB) may take a while to upload

	return nil
}

// PathSize returns the size of a file, or the total size of all regular
// files under a directory
func PathSize(path string) (int64, error) {
	var total int64
	err := filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.Mode().IsRegular() {
			total += info.Size()
		}
		return nil
	})
	return total, err
}
