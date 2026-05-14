package main

import (
	"bytes"
	"crypto/md5"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type CertdClient struct {
	KeyID     string
	KeySecret string
	BaseURL   string
	Encrypt   bool
	SignType  string
}

type tokenContent struct {
	KeyID    string `json:"keyId"`
	T        int64  `json:"t"`
	Encrypt  bool   `json:"encrypt"`
	SignType string `json:"signType"`
}

func NewCertdClient(keyID, keySecret string) (*CertdClient, error) {
	if keyID == "" {
		return nil, fmt.Errorf("keyID is required")
	}
	if keySecret == "" {
		return nil, fmt.Errorf("keySecret is required")
	}
	return &CertdClient{
		KeyID:     keyID,
		KeySecret: keySecret,
		BaseURL:   "http://127.0.0.1:7001",
		SignType:  "md5",
	}, nil
}

func (c *CertdClient) GetSign(content string) (string, error) {
	if c.SignType != "md5" {
		return "", fmt.Errorf("unsupported signType: %s", c.SignType)
	}
	sum := md5.Sum([]byte(content + c.KeySecret))
	return hex.EncodeToString(sum[:]), nil
}

func (c *CertdClient) GetToken() (string, error) {
	contentBytes, err := json.Marshal(tokenContent{
		KeyID:    c.KeyID,
		T:        time.Now().Unix(),
		Encrypt:  c.Encrypt,
		SignType: c.SignType,
	})
	if err != nil {
		return "", err
	}
	content := string(contentBytes)
	sign, err := c.GetSign(content)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString([]byte(content)) + "." + base64.StdEncoding.EncodeToString([]byte(sign)), nil
}

func (c *CertdClient) Request(path string, body any) ([]byte, error) {
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	token, err := c.GetToken()
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest(http.MethodPost, strings.TrimRight(c.BaseURL, "/")+path, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("content-type", "application/json")
	httpReq.Header.Set("x-certd-token", token)

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}
	return respBody, nil
}

func (c *CertdClient) GetCert(params any) ([]byte, error) {
	return c.Request("/api/v1/cert/get", params)
}
