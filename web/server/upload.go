package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"path/filepath"
	"strconv"
	"strings"
)

const uploadChunkSize = 10 * 1024 * 1024

// CreateDocumentFromReader follows Therefore's binary upload-session workflow.
// Only one chunk is buffered. Progress counts acknowledged bytes, not bytes read.
// Requests are not automatically replayed after an ambiguous network failure.
func (c *ThereforeAPIClient) CreateDocumentFromReader(ctx context.Context, categoryNo int, filename string, source io.Reader, size int64, indexData []IndexDataItem, progress func(int64, int64)) (*CreateDocumentResponse, error) {
	if size < 0 {
		return nil, fmt.Errorf("invalid upload size")
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	extension := filepath.Ext(filename)
	body, _ := json.Marshal(map[string]interface{}{
		"FileSize": size, "FileExtension": extension,
		"FileNameWithoutExtension": strings.TrimSuffix(filename, extension),
	})
	data, err := c.makeRequestContext(ctx, "POST", "UploadSessionStart", bytes.NewReader(body), "application/json; charset=utf-8", nil)
	if err != nil {
		return nil, fmt.Errorf("could not start upload: %w", err)
	}
	var session struct {
		SessionID string `json:"SessionId"`
	}
	if err := json.Unmarshal(data, &session); err != nil || session.SessionID == "" {
		return nil, fmt.Errorf("Therefore did not return an upload session ID")
	}
	if progress != nil {
		progress(0, size)
	}
	buffer := make([]byte, uploadChunkSize)
	for offset := int64(0); offset < size; {
		if err := ctx.Err(); err != nil {
			return nil, fmt.Errorf("upload cancelled: %w", err)
		}
		length := int64(len(buffer))
		if size-offset < length {
			length = size - offset
		}
		chunk := buffer[:length]
		if _, err := io.ReadFull(source, chunk); err != nil {
			return nil, fmt.Errorf("could not read upload file at byte %d: %w", offset, err)
		}
		_, err := c.makeRequestContext(ctx, "POST", "UploadSessionAppendChunkRaw", bytes.NewReader(chunk), "application/octet-stream", map[string]string{
			"X-The-UploadSession-Id":            session.SessionID,
			"X-The-UploadSession-ChunkPosition": strconv.FormatInt(offset, 10),
		})
		if err != nil {
			return nil, fmt.Errorf("chunk upload failed at byte %d; document creation was not requested: %w", offset, err)
		}
		offset += length
		if progress != nil {
			progress(offset, size)
		}
	}
	// Detect a file that grew during upload rather than silently archiving a prefix.
	var extra [1]byte
	if n, err := source.Read(extra[:]); n != 0 || (err != nil && err != io.EOF) {
		return nil, fmt.Errorf("upload file changed or could not be read completely; document creation was not requested")
	}
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("upload cancelled: %w", err)
	}
	if size == 0 && progress != nil {
		progress(0, 0)
	}
	body, err = json.Marshal(CreateDocumentRequest{
		CategoryNo: categoryNo, IndexData: indexData,
		FileUploadSessions: []FileUploadSession{{FileName: filename, UploadSessionID: session.SessionID}},
	})
	if err != nil {
		return nil, err
	}
	data, err = c.makeRequestContext(ctx, "POST", "CreateDocument", bytes.NewReader(body), "application/json; charset=utf-8", nil)
	if err != nil {
		return nil, err
	}
	var result CreateDocumentResponse
	if json.Unmarshal(data, &result) == nil && result.DocNo > 0 {
		return &result, nil
	}
	var wrapped struct{ CreateDocumentResult CreateDocumentResponse }
	if json.Unmarshal(data, &wrapped) == nil && wrapped.CreateDocumentResult.DocNo > 0 {
		return &wrapped.CreateDocumentResult, nil
	}
	return nil, fmt.Errorf("Therefore returned no document number; check the sharing category before retrying")
}
