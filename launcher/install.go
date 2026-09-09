package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

func ensureRuntime() (string, error) {
	if len(runtimeSHA) != 64 {
		return "", fmt.Errorf("launcher has no pinned runtime; build with scripts/build-release.mjs")
	}
	if _, err := hex.DecodeString(runtimeSHA); err != nil {
		return "", err
	}
	base := os.Getenv("CLAPPER_HOME")
	if base == "" {
		cache, err := os.UserCacheDir()
		if err != nil {
			return "", err
		}
		base = filepath.Join(cache, "clapper")
	}
	base, err := filepath.Abs(base)
	if err != nil {
		return "", err
	}
	if err = os.MkdirAll(base, 0700); err != nil {
		return "", err
	}
	dest := filepath.Join(base, runtimeSHA)
	// flock is released even if the installer crashes; no stale PID/lock cleanup.
	lock, err := os.OpenFile(dest+".lock", os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return "", err
	}
	defer lock.Close()
	if err = syscall.Flock(int(lock.Fd()), syscall.LOCK_EX); err != nil {
		return "", err
	}
	defer syscall.Flock(int(lock.Fd()), syscall.LOCK_UN)
	if _, err = os.Stat(dest); err == nil {
		if err = validateRuntime(dest); err != nil {
			return "", fmt.Errorf("cached runtime is damaged at %s: %w; move that directory aside and retry", dest, err)
		}
		return dest, nil
	} else if !os.IsNotExist(err) {
		return "", err
	}
	stage, err := os.MkdirTemp(base, ".install-")
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(stage)
	source := os.Getenv("CLAPPER_RUNTIME_URL")
	if source == "" {
		source = runtimeURL
	}
	if source == "" {
		return "", fmt.Errorf("no runtime URL configured")
	}
	fmt.Fprintf(os.Stderr, "Installing Clapper %s runtime (one-time download)…\n", version)
	archive := filepath.Join(stage, "runtime.tar.gz")
	if err = downloadVerified(source, archive, runtimeSHA); err != nil {
		return "", err
	}
	root := filepath.Join(stage, "runtime")
	if err = os.Mkdir(root, 0700); err != nil {
		return "", err
	}
	if err = extractArchive(archive, root); err != nil {
		return "", err
	}
	if err = validateRuntime(root); err != nil {
		return "", err
	}
	if err = os.Rename(root, dest); err != nil {
		return "", err
	}
	return dest, nil
}

func downloadVerified(source, dest, want string) error {
	var err error
	source, err = githubAssetURL(source)
	if err != nil {
		return err
	}
	u, err := url.Parse(source)
	if err != nil {
		return err
	}
	var reader io.ReadCloser
	switch u.Scheme {
	case "file":
		if u.Host != "" && u.Host != "localhost" {
			return fmt.Errorf("file URL must be local")
		}
		reader, err = os.Open(u.Path)
	case "https", "http":
		if u.Scheme == "http" && u.Hostname() != "127.0.0.1" && u.Hostname() != "localhost" && u.Hostname() != "::1" {
			return fmt.Errorf("runtime downloads require HTTPS (HTTP allowed only on loopback)")
		}
		client := http.Client{Timeout: 15 * time.Minute, CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) > 10 {
				return fmt.Errorf("too many redirects")
			}
			if req.URL.Scheme != "https" && !(u.Scheme == "http" && req.URL.Host == u.Host) {
				return fmt.Errorf("unsafe runtime redirect")
			}
			return nil
		}}
		req, e := http.NewRequest("GET", source, nil)
		if e != nil {
			return e
		}
		// GitHub's release-asset API works for this private repository too.
		// Authorization is only attached to api.github.com, never arbitrary mirrors.
		if u.Host == "api.github.com" && os.Getenv("GH_TOKEN") != "" {
			req.Header.Set("Authorization", "Bearer "+os.Getenv("GH_TOKEN"))
			req.Header.Set("Accept", "application/octet-stream")
		}
		resp, e := client.Do(req)
		if e != nil {
			return e
		}
		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			return fmt.Errorf("runtime download returned HTTP %d; for private releases use an authenticated GitHub asset API URL or a local file URL via CLAPPER_RUNTIME_URL", resp.StatusCode)
		}
		reader = resp.Body
	default:
		return fmt.Errorf("runtime URL must use https:// or file://")
	}
	if err != nil {
		return err
	}
	defer reader.Close()
	f, err := os.OpenFile(dest, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	h := sha256.New()
	n, copyErr := io.Copy(io.MultiWriter(f, h), io.LimitReader(reader, 2<<30))
	closeErr := f.Close()
	if copyErr != nil {
		return copyErr
	}
	if closeErr != nil {
		return closeErr
	}
	if n == 2<<30 {
		return fmt.Errorf("runtime archive too large")
	}
	if !strings.EqualFold(hex.EncodeToString(h.Sum(nil)), want) {
		return fmt.Errorf("runtime SHA-256 mismatch; nothing installed")
	}
	return nil
}
