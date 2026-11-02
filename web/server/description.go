package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"unicode/utf16"
)

// TextField is an editable, top-level text field that can hold a description.
type TextField struct {
	FieldNo   int    `json:"fieldNo"`
	Caption   string `json:"caption"`
	MaxLength int    `json:"maxLength"`
}

func (c *ThereforeAPIClient) GetCategoryTextFields(categoryNo int) ([]TextField, error) {
	if categoryNo <= 0 {
		return nil, fmt.Errorf("select a category first")
	}
	body, _ := json.Marshal(map[string]any{"CategoryNo": categoryNo, "IsAccessMaskNeeded": false})
	data, err := c.makeRequest("POST", "GetCategoryInfo", body)
	if err != nil {
		return nil, err
	}
	var response struct {
		CategoryFields []struct {
			FieldNo            int
			Caption            string
			IndexDataFieldName string
			FieldType          json.RawMessage
			Length             int
			BelongsToTable     int
			BelongsTo          int
			IsSingleKeyword    bool
			IsMultipleKeyword  bool
			IsForeignDatatype  bool
			Formula            string
		}
	}
	if err := json.Unmarshal(data, &response); err != nil {
		return nil, fmt.Errorf("invalid category metadata: %w", err)
	}
	fields := make([]TextField, 0)
	for _, field := range response.CategoryFields {
		// Category field types differ from query column types. StringField is 1.
		kind := string(field.FieldType)
		if kind != "1" && kind != `"StringField"` {
			continue
		}
		if field.FieldNo <= 0 || field.BelongsToTable != 0 || field.BelongsTo != 0 || field.IsSingleKeyword || field.IsMultipleKeyword || field.IsForeignDatatype || field.Formula != "" {
			continue
		}
		caption := field.Caption
		if caption == "" {
			caption = field.IndexDataFieldName
		}
		if caption == "" {
			caption = fmt.Sprintf("Field #%d", field.FieldNo)
		}
		fields = append(fields, TextField{field.FieldNo, caption, field.Length})
	}
	return fields, nil
}

// PrepareDescription validates the saved mapping and lets Therefore apply defaults
// and calculations. Preserve all typed items returned by preprocessing.
func (c *ThereforeAPIClient) PrepareDescription(categoryNo, fieldNo int, description, filename string) ([]IndexDataItem, error) {
	if fieldNo == 0 {
		return []IndexDataItem{}, nil
	}
	fields, err := c.GetCategoryTextFields(categoryNo)
	if err != nil {
		return nil, fmt.Errorf("could not validate description field: %w", err)
	}
	var selected *TextField
	for i := range fields {
		if fields[i].FieldNo == fieldNo {
			selected = &fields[i]
			break
		}
	}
	if selected == nil {
		return nil, fmt.Errorf("the description field is no longer available; choose a text field in Settings")
	}
	value := strings.TrimSpace(description)
	if value == "" {
		value = filename
	}
	if selected.MaxLength > 0 && len(utf16.Encode([]rune(value))) > selected.MaxLength {
		return nil, fmt.Errorf("description exceeds the %d character limit for %s", selected.MaxLength, selected.Caption)
	}
	typed, _ := json.Marshal(StringIndexData{FieldNo: fieldNo, DataValue: value})
	items := []IndexDataItem{{"StringIndexData": typed}}
	body, _ := json.Marshal(map[string]any{
		"CategoryNo":      categoryNo,
		"IndexData":       map[string]any{"IndexDataItems": items},
		"ResetToDefaults": false, "FillDependentFields": true, "DoCalculateFields": true,
	})
	data, err := c.makeRequest("POST", "PreprocessIndexData", body)
	if err != nil {
		return nil, fmt.Errorf("could not prepare description: %w", err)
	}
	var result struct {
		IndexData struct{ IndexDataItems []IndexDataItem }
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	items = result.IndexData.IndexDataItems
	// Do not silently upload an undescribed document if preprocessing drops the field.
	if descriptionValue(items, fieldNo) != value {
		return nil, fmt.Errorf("Therefore changed or rejected the description; check the field's rules in Settings")
	}
	body, _ = json.Marshal(map[string]any{"CategoryNo": categoryNo, "IndexDataItems": items})
	if _, err := c.makeRequest("POST", "EvaluateConditionalProperties", body); err != nil {
		return nil, fmt.Errorf("could not validate index data: %w", err)
	}
	return items, nil
}

func descriptionValue(items []IndexDataItem, fieldNo int) string {
	for _, item := range items {
		var value StringIndexData
		if raw, ok := item["StringIndexData"]; ok && json.Unmarshal(raw, &value) == nil && value.FieldNo == fieldNo {
			return value.DataValue
		}
	}
	return ""
}

// PopulateDescriptions reads the actual mapped value, which need not be part of
// Therefore's generated DocumentTitle. A failed lookup leaves filename fallback
// available and does not hide the rest of the share history.
func (c *ThereforeAPIClient) PopulateDescriptions(entries []SharedLinkViewEntry, fields map[int]int) {
	if len(fields) == 0 {
		return
	}
	byDocument := make(map[int64][]int)
	for i, entry := range entries {
		byDocument[entry.SharedLink.DocNo] = append(byDocument[entry.SharedLink.DocNo], i)
	}
	var wg sync.WaitGroup
	limit := make(chan struct{}, 4)
	for docNo, indices := range byDocument {
		limit <- struct{}{}
		wg.Add(1)
		go func(docNo int64, indices []int) {
			defer wg.Done()
			defer func() { <-limit }()
			body, _ := json.Marshal(map[string]any{"DocNo": docNo})
			data, err := c.makeRequest("POST", "GetDocumentIndexData", body)
			if err != nil {
				return
			}
			var result struct {
				IndexData struct {
					CategoryNo     int
					IndexDataItems []IndexDataItem
				}
			}
			if json.Unmarshal(data, &result) != nil {
				return
			}
			fieldNo := fields[result.IndexData.CategoryNo]
			if fieldNo == 0 {
				return
			}
			value := strings.TrimSpace(descriptionValue(result.IndexData.IndexDataItems, fieldNo))
			for _, i := range indices {
				entries[i].Description = value
			}
		}(docNo, indices)
	}
	wg.Wait()
}
