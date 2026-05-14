package main

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type certGetRequest struct {
	Domains   string `json:"domains,omitempty"`
	CertID    int64  `json:"certId,omitempty"`
	AutoApply bool   `json:"autoApply"`
	Format    string `json:"format,omitempty"`
}

func requireEnv(name string) (string, error) {
	value := os.Getenv(name)
	if value == "" {
		return "", fmt.Errorf("missing environment variable: %s", name)
	}
	return value, nil
}

func boolEnv(name string, defaultValue bool) bool {
	value := os.Getenv(name)
	if value == "" {
		return defaultValue
	}
	switch strings.ToLower(value) {
	case "1", "true", "yes", "y":
		return true
	default:
		return false
	}
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	keyID, err := requireEnv("CERTD_KEY_ID")
	if err != nil {
		return err
	}
	keySecret, err := requireEnv("CERTD_KEY_SECRET")
	if err != nil {
		return err
	}

	client, err := NewCertdClient(keyID, keySecret)
	if err != nil {
		return err
	}
	if baseURL := os.Getenv("CERTD_BASE_URL"); baseURL != "" {
		client.BaseURL = baseURL
	}
	client.Encrypt = boolEnv("CERTD_ENCRYPT", false)

	reqBody := certGetRequest{
		Domains:   os.Getenv("CERTD_DOMAINS"),
		AutoApply: boolEnv("CERTD_AUTO_APPLY", false),
		Format:    os.Getenv("CERTD_FORMAT"),
	}
	if certID := os.Getenv("CERTD_CERT_ID"); certID != "" {
		reqBody.CertID, err = strconv.ParseInt(certID, 10, 64)
		if err != nil || reqBody.CertID <= 0 {
			return fmt.Errorf("CERTD_CERT_ID must be a positive integer")
		}
	}
	if reqBody.CertID == 0 && reqBody.Domains == "" {
		return fmt.Errorf("set CERTD_CERT_ID or CERTD_DOMAINS")
	}

	respBody, err := client.GetCert(reqBody)
	if err != nil {
		return err
	}
	fmt.Println(string(respBody))
	return nil
}
