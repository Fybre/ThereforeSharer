package main

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestUploadHasSeparateTimeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(50 * time.Millisecond)
		w.Write([]byte(`{"DocNo":42}`))
	}))
	defer server.Close()
	client := NewThereforeAPIClient(server.URL, "test", "Bearer test")
	client.HTTPClient.Timeout = 10 * time.Millisecond
	client.UploadTimeout = time.Second
	if _, err := client.makeRequestContext(context.Background(), "POST", "CreateDocument", nil, "application/json", nil); err != nil {
		t.Fatal(err)
	}
	if client.HTTPClient.Timeout != 10*time.Millisecond {
		t.Fatal("shared API client was modified")
	}
	if _, err := client.makeRequest("POST", "GetCategoryInfo", []byte(`{}`)); err == nil {
		t.Fatal("ordinary API timeout was bypassed")
	}
	// Exercise the desktop request path without emitting Wails progress events.
	if _, err := client.makeRequestContext(context.Background(), "POST", "CreateDocument", nil, "application/json", nil); err != nil {
		t.Fatal(err)
	}
}

func TestUploadTimeoutDoesNotRetry(t *testing.T) {
	var count atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		count.Add(1)
		<-r.Context().Done()
	}))
	defer server.Close()
	client := NewThereforeAPIClient(server.URL, "test", "Bearer test")
	client.UploadTimeout = 30 * time.Millisecond
	_, err := client.makeRequestContext(context.Background(), "POST", "CreateDocument", nil, "application/json", nil)
	if err == nil || !strings.Contains(err.Error(), "document may already exist") {
		t.Fatalf("missing uncertain outcome message: %v", err)
	}
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("timeout cause lost: %v", err)
	}
	if count.Load() != 1 {
		t.Fatalf("upload retried %d times", count.Load())
	}
}

func TestUploadCanStillBeCancelled(t *testing.T) {
	started := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		close(started)
		<-r.Context().Done()
	}))
	defer server.Close()
	client := NewThereforeAPIClient(server.URL, "test", "Bearer test")
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go func() { <-started; cancel() }()
	_, err := client.makeRequestContext(ctx, "POST", "CreateDocument", nil, "application/json", nil)
	if err == nil || !strings.Contains(err.Error(), "upload cancelled") {
		t.Fatalf("cancellation failed: %v", err)
	}
}
