package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func testAPI(t *testing.T, handler http.HandlerFunc) *ThereforeAPIClient {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	return NewThereforeAPIClient(server.URL, "test", "Bearer test")
}

func TestDescriptionCreation(t *testing.T) {
	for _, input := range []string{"  Client proposal  ", ""} {
		t.Run(input, func(t *testing.T) {
			expected := strings.TrimSpace(input)
			if expected == "" {
				expected = "Proposal.zip"
			}
			var operations []string
			var prepared []IndexDataItem
			client := testAPI(t, func(w http.ResponseWriter, r *http.Request) {
				op := strings.TrimPrefix(r.URL.Path, "/theservice/v0001/restun/")
				operations = append(operations, op)
				if r.Method != "POST" || r.Header.Get("TenantName") != "test" {
					t.Error("invalid request headers or method")
				}
				if op == "UploadSessionAppendChunkRaw" {
					content, _ := io.ReadAll(r.Body)
					if string(content) != "zip" {
						t.Error("file bytes changed")
					}
					w.WriteHeader(200)
					return
				}
				var body map[string]json.RawMessage
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					t.Error(err)
				}
				switch op {
				case "UploadSessionStart":
					w.Write([]byte(`{"SessionId":"test-session"}`))
				case "GetCategoryInfo":
					w.Write([]byte(`{"CategoryFields":[{"FieldNo":11,"Caption":"Description","FieldType":1,"Length":100}]}`))
				case "PreprocessIndexData":
					var index struct{ IndexDataItems []IndexDataItem }
					if err := json.Unmarshal(body["IndexData"], &index); err != nil {
						t.Error(err)
					}
					if descriptionValue(index.IndexDataItems, 11) != expected {
						t.Error("description missing from typed preprocessing input")
					}
					prepared = append(index.IndexDataItems, IndexDataItem{"IntIndexData": json.RawMessage(`{"FieldNo":12,"DataValue":42}`)})
					json.NewEncoder(w).Encode(map[string]any{"IndexData": map[string]any{"IndexDataItems": prepared}})
				case "EvaluateConditionalProperties":
					w.Write([]byte(`{}`))
				case "CreateDocument":
					if _, bad := body["IndexData"]; bad {
						t.Error("legacy IndexData key used")
					}
					var items []IndexDataItem
					json.Unmarshal(body["IndexDataItems"], &items)
					if len(items) != 2 || descriptionValue(items, 11) != expected {
						t.Error("description or preprocessed defaults lost")
					}
					var streams []FileUploadSession
					json.Unmarshal(body["FileUploadSessions"], &streams)
					if len(streams) != 1 || streams[0].FileName != "Proposal.zip" {
						t.Error("filename changed")
					}
					w.Write([]byte(`{"DocNo":77}`))
				default:
					t.Errorf("unexpected operation: %s", op)
				}
			})
			items, err := client.PrepareDescription(5, 11, input, "Proposal.zip")
			if err != nil {
				t.Fatal(err)
			}
			result, err := client.CreateDocument(5, "Proposal.zip", []byte("zip"), items)
			if err != nil || result.DocNo != 77 {
				t.Fatalf("result=%v err=%v", result, err)
			}
			if strings.Join(operations, ",") != "GetCategoryInfo,PreprocessIndexData,EvaluateConditionalProperties,UploadSessionStart,UploadSessionAppendChunkRaw,CreateDocument" {
				t.Fatal(operations)
			}
		})
	}
}

func TestTextFieldFiltering(t *testing.T) {
	client := testAPI(t, func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"CategoryFields":[
   {"FieldNo":1,"FieldType":1,"Caption":"Description"},
   {"FieldNo":2,"FieldType":"StringField","Caption":"Title"},
   {"FieldNo":3,"FieldType":2},
   {"FieldNo":4,"FieldType":1,"BelongsToTable":9},
   {"FieldNo":5,"FieldType":1,"IsSingleKeyword":true},
   {"FieldNo":6,"FieldType":1,"IsForeignDatatype":true},
   {"FieldNo":7,"FieldType":1,"Formula":"calculated"},
   {"FieldNo":8,"FieldType":1,"BelongsTo":1},
   {"FieldNo":9,"FieldType":9},
   {"FieldNo":10,"FieldType":1,"IsMultipleKeyword":true}
  ]}`))
	})
	fields, err := client.GetCategoryTextFields(5)
	if err != nil || len(fields) != 2 || fields[0].FieldNo != 1 || fields[1].FieldNo != 2 {
		t.Fatalf("fields=%v err=%v", fields, err)
	}
}

func TestInvalidDescriptionDoesNotUpload(t *testing.T) {
	client := testAPI(t, func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "GetCategoryInfo") {
			t.Error("invalid input reached write preparation")
		}
		w.Write([]byte(`{"CategoryFields":[{"FieldNo":11,"FieldType":1,"Length":3}]}`))
	})
	for _, test := range []struct {
		field int
		text  string
	}{{99, "ok"}, {11, "long"}, {11, "😀😀"}} {
		if _, err := client.PrepareDescription(5, test.field, test.text, "archive.zip"); err == nil {
			t.Errorf("accepted invalid description: %+v", test)
		}
	}
	disabled := testAPI(t, func(w http.ResponseWriter, r *http.Request) { t.Error("disabled field triggered network request") })
	if items, err := disabled.PrepareDescription(5, 0, "ignored", "archive.zip"); err != nil || len(items) != 0 {
		t.Fatal(items, err)
	}
}

func TestHistoryDescriptionAndFilenameFallback(t *testing.T) {
	var calls atomic.Int32
	client := testAPI(t, func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		var body struct{ DocNo int64 }
		json.NewDecoder(r.Body).Decode(&body)
		if body.DocNo == 9 {
			http.Error(w, "unavailable", 403)
			return
		}
		w.Write([]byte(`{"IndexData":{"CategoryNo":5,"IndexDataItems":[{"StringIndexData":{"FieldNo":11,"DataValue":"Project proposal"}}]}}`))
	})
	entries := []SharedLinkViewEntry{
		{SharedLink: SharedLinkInfo{DocNo: 7, Filename: "proposal.zip"}},
		{SharedLink: SharedLinkInfo{DocNo: 7, Filename: "proposal.zip"}},
		{SharedLink: SharedLinkInfo{DocNo: 9, Filename: "legacy.zip"}},
	}
	client.PopulateDescriptions(entries, map[int]int{5: 11})
	if calls.Load() != 2 {
		t.Fatal("duplicate document fetched more than once")
	}
	if entries[0].Description != "Project proposal" || entries[1].Description != "Project proposal" || entries[2].Description != "" || entries[2].SharedLink.Filename != "legacy.zip" {
		t.Fatal(entries)
	}
}
