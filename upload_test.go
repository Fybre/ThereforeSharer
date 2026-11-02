package main

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

func TestChunkUploadProtocol(t *testing.T) {
	payload := bytes.Repeat([]byte{0, 255, 1, 128, 42}, (uploadChunkSize*2)/5+9)
	var received []byte
	var positions []int64
	created := false
	client := testAPI(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.Header.Get("Authorization") != "Bearer test" || r.Header.Get("TenantName") != "test" {
			t.Error("missing auth/method")
		}
		switch {
		case strings.HasSuffix(r.URL.Path, "UploadSessionStart"):
			var body struct {
				FileSize                 int64
				FileExtension            string
				FileNameWithoutExtension string
			}
			json.NewDecoder(r.Body).Decode(&body)
			if body.FileSize != int64(len(payload)) || body.FileExtension != ".zip" || body.FileNameWithoutExtension != "archive" {
				t.Errorf("invalid start: %+v", body)
			}
			w.Write([]byte(`{"SessionId":"abc-123"}`))
		case strings.HasSuffix(r.URL.Path, "UploadSessionAppendChunkRaw"):
			offset, _ := strconv.ParseInt(r.Header.Get("X-The-UploadSession-ChunkPosition"), 10, 64)
			if offset != int64(len(received)) {
				t.Errorf("wrong byte offset: %d", offset)
			}
			if r.Header.Get("Content-Type") != "application/octet-stream" || r.Header.Get("X-The-UploadSession-Id") != "abc-123" {
				t.Error("invalid chunk headers")
			}
			chunk, _ := io.ReadAll(r.Body)
			if len(chunk) > uploadChunkSize || r.ContentLength != int64(len(chunk)) {
				t.Error("incorrect chunk length")
			}
			positions = append(positions, offset)
			received = append(received, chunk...)
			w.WriteHeader(http.StatusNoContent)
		case strings.HasSuffix(r.URL.Path, "CreateDocument"):
			var body map[string]json.RawMessage
			json.NewDecoder(r.Body).Decode(&body)
			if _, exists := body["Streams"]; exists {
				t.Error("inline file content still present")
			}
			var sessions []FileUploadSession
			json.Unmarshal(body["FileUploadSessions"], &sessions)
			if len(sessions) != 1 || sessions[0].UploadSessionID != "abc-123" || sessions[0].FileName != "archive.zip" {
				t.Fatal(sessions)
			}
			if !bytes.Equal(payload, received) {
				t.Error("uploaded bytes do not match source")
			}
			created = true
			w.Write([]byte(`{"DocNo":123}`))
		default:
			t.Fatal(r.URL.Path)
		}
	})
	var acknowledged []int64
	result, err := client.CreateDocumentFromReader(context.Background(), 1, "archive.zip", bytes.NewReader(payload), int64(len(payload)), nil, func(done, total int64) {
		if done != int64(len(received)) || total != int64(len(payload)) {
			t.Error("progress advanced before server acknowledgement")
		}
		acknowledged = append(acknowledged, done)
	})
	if err != nil || !created || result.DocNo != 123 {
		t.Fatalf("result=%v err=%v", result, err)
	}
	if len(positions) != 3 || len(acknowledged) != 4 {
		t.Fatal(positions, acknowledged)
	}
}

func TestFailedChunkNeverCreatesDocument(t *testing.T) {
	calls := 0
	client := testAPI(t, func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "UploadSessionStart"):
			w.Write([]byte(`{"SessionId":"abc"}`))
		case strings.HasSuffix(r.URL.Path, "UploadSessionAppendChunkRaw"):
			calls++
			http.Error(w, "failed", 500)
		default:
			t.Error("attempted finalisation after failed chunk")
		}
	})
	_, err := client.CreateDocument(1, "archive.zip", []byte("data"), nil)
	if err == nil || calls != 1 {
		t.Fatal(err, calls)
	}
}

func TestCancellationAfterChunkStopsFinalisation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	client := testAPI(t, func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "UploadSessionStart") {
			w.Write([]byte(`{"SessionId":"abc"}`))
			return
		}
		if strings.HasSuffix(r.URL.Path, "CreateDocument") {
			t.Error("created document after cancellation")
		}
	})
	_, err := client.CreateDocumentFromReader(ctx, 1, "archive.zip", strings.NewReader("zip"), 3, nil, func(done, total int64) {
		if done > 0 {
			cancel()
		}
	})
	if err == nil {
		t.Fatal("cancellation ignored")
	}
}

func TestUploadFilePreservesZipAndCleansTemporaryArchive(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "existing.ZIP")
	content := []byte("existing ZIP bytes")
	os.WriteFile(path, content, 0600)
	file, cleanup, err := OpenUploadFile(context.Background(), []string{path})
	if err != nil {
		t.Fatal(err)
	}
	got, _ := io.ReadAll(file)
	cleanup()
	if !bytes.Equal(got, content) {
		t.Fatal("ZIP was modified")
	}
	if _, err := os.Stat(path); err != nil {
		t.Fatal("original ZIP deleted")
	}
	other := filepath.Join(dir, "report.txt")
	os.WriteFile(other, []byte("report"), 0600)
	file, cleanup, err = OpenUploadFile(context.Background(), []string{other, path})
	if err != nil {
		t.Fatal(err)
	}
	temporary := file.Name()
	info, _ := file.Stat()
	archive, err := zip.NewReader(file, info.Size())
	if err != nil || len(archive.File) != 2 {
		t.Fatal("invalid archive", err)
	}
	cleanup()
	if _, err := os.Stat(temporary); !os.IsNotExist(err) {
		t.Fatal("temporary archive not cleaned up")
	}
}
