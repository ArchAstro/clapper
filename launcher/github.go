package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// Resolve an authenticated GitHub release URL without requiring gh on PATH.
// Public releases work directly; private releases need a caller-provided token.
func githubAssetURL(source string) (string, error) {
	u, err := url.Parse(source)
	if err != nil {
		return "", err
	}
	token := os.Getenv("GH_TOKEN")
	if u.Host != "github.com" || token == "" {
		return source, nil
	}
	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	if len(parts) != 6 || parts[2] != "releases" || parts[3] != "download" {
		return source, nil
	}
	api := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/tags/%s", url.PathEscape(parts[0]), url.PathEscape(parts[1]), url.PathEscape(parts[4]))
	req, err := http.NewRequest("GET", api, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := (&http.Client{Timeout: 30 * time.Second}).Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("GitHub release lookup returned HTTP %d", resp.StatusCode)
	}
	var release struct {
		Assets []struct {
			Name string `json:"name"`
			URL  string `json:"url"`
		} `json:"assets"`
	}
	if err = json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return "", err
	}
	for _, asset := range release.Assets {
		if asset.Name == parts[5] {
			return asset.URL, nil
		}
	}
	return "", fmt.Errorf("runtime asset %s is not in release %s", parts[5], parts[4])
}
