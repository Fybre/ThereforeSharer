package main

import (
	"archive/zip"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// OpenUploadFile keeps existing ZIP files intact; other selections are archived
// to a private temporary file, never a full in-memory buffer.
func OpenUploadFile(ctx context.Context, paths []string) (*os.File, func(), error) {
	if err := ctx.Err(); err != nil {
		return nil, nil, err
	}
	if len(paths) == 0 {
		return nil, nil, fmt.Errorf("no files provided")
	}
	if len(paths) == 1 && strings.EqualFold(filepath.Ext(paths[0]), ".zip") {
		info, err := os.Stat(paths[0])
		if err != nil {
			return nil, nil, err
		}
		if info.Mode().IsRegular() {
			file, err := os.Open(paths[0])
			if err != nil {
				return nil, nil, err
			}
			return file, func() { file.Close() }, nil
		}
	}
	file, err := os.CreateTemp("", "therefore-upload-*.zip")
	if err != nil {
		return nil, nil, err
	}
	cleanup := func() { file.Close(); os.Remove(file.Name()) }
	writer := zip.NewWriter(&cancelWriter{ctx: ctx, writer: file})
	for _, path := range paths {
		if err := ctx.Err(); err != nil {
			writer.Close()
			cleanup()
			return nil, nil, err
		}
		if err := addPathToZip(writer, path); err != nil {
			writer.Close()
			cleanup()
			return nil, nil, err
		}
	}
	if err := writer.Close(); err != nil {
		cleanup()
		return nil, nil, err
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		cleanup()
		return nil, nil, err
	}
	return file, cleanup, nil
}

type cancelWriter struct {
	ctx    context.Context
	writer io.Writer
}

func (w *cancelWriter) Write(data []byte) (int, error) {
	if err := w.ctx.Err(); err != nil {
		return 0, err
	}
	return w.writer.Write(data)
}
