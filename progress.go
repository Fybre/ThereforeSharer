package main

import (
	"context"
	"io"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// ProgressReader wraps an io.Reader and reports progress
type ProgressReader struct {
	reader      io.Reader
	ctx         context.Context
	total       int64
	current     int64
	lastPercent int
}

// NewProgressReader creates a new progress tracking reader
func NewProgressReader(ctx context.Context, reader io.Reader, total int64) *ProgressReader {
	return &ProgressReader{
		reader:      reader,
		ctx:         ctx,
		total:       total,
		current:     0,
		lastPercent: -1,
	}
}

// Read implements io.Reader and emits progress events
func (pr *ProgressReader) Read(p []byte) (int, error) {
	n, err := pr.reader.Read(p)
	pr.current += int64(n)

	// Calculate percentage
	percent := 0
	if pr.total > 0 {
		percent = int((pr.current * 100) / pr.total)
	}

	// Only emit if percentage changed (avoid spamming events)
	if percent != pr.lastPercent && percent <= 100 {
		pr.lastPercent = percent
		runtime.EventsEmit(pr.ctx, "upload-progress", map[string]interface{}{
			"current": pr.current,
			"total":   pr.total,
			"percent": percent,
		})
	}

	return n, err
}
