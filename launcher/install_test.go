package main

import (
	"archive/tar"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

type testEntry struct {
	name, body, target string
	kind               byte
}

func makeArchive(t *testing.T, entries []testEntry) string {
	t.Helper()
	file := filepath.Join(t.TempDir(), "test.tar.gz")
	f, e := os.Create(file)
	if e != nil {
		t.Fatal(e)
	}
	gz := gzip.NewWriter(f)
	tw := tar.NewWriter(gz)
	for _, v := range entries {
		kind := v.kind
		if kind == 0 {
			kind = tar.TypeReg
		}
		h := &tar.Header{Name: v.name, Mode: 0755, Typeflag: kind, Linkname: v.target}
		if kind == tar.TypeReg {
			h.Size = int64(len(v.body))
		}
		if e = tw.WriteHeader(h); e != nil {
			t.Fatal(e)
		}
		if h.Size > 0 {
			if _, e = tw.Write([]byte(v.body)); e != nil {
				t.Fatal(e)
			}
		}
	}
	if e = tw.Close(); e != nil {
		t.Fatal(e)
	}
	if e = gz.Close(); e != nil {
		t.Fatal(e)
	}
	if e = f.Close(); e != nil {
		t.Fatal(e)
	}
	return file
}

func TestArchiveBoundaries(t *testing.T) {
	for name, entries := range map[string][]testEntry{
		"traversal":     {{name: "../outside", body: "bad"}},
		"absolute":      {{name: "/outside", body: "bad"}},
		"escaping-link": {{name: "node/link", target: "../../outside", kind: tar.TypeSymlink}},
		"link-parent":   {{name: "a", target: "b", kind: tar.TypeSymlink}, {name: "a/file", body: "bad"}},
		"device":        {{name: "device", kind: tar.TypeChar}},
	} {
		t.Run(name, func(t *testing.T) {
			if err := extractArchive(makeArchive(t, entries), t.TempDir()); err == nil {
				t.Fatal("accepted unsafe archive")
			}
		})
	}
	root := t.TempDir()
	archive := makeArchive(t, []testEntry{{name: "lib/core/index.js", body: "ok"}, {name: "modules/core", target: "../lib/core", kind: tar.TypeSymlink}})
	if e := extractArchive(archive, root); e != nil {
		t.Fatal(e)
	}
	b, e := os.ReadFile(filepath.Join(root, "modules/core/index.js"))
	if e != nil || string(b) != "ok" {
		t.Fatalf("internal dependency link failed: %s %v", b, e)
	}
}

func TestDownloadIntegrity(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("payload")) }))
	defer server.Close()
	h := sha256.Sum256([]byte("payload"))
	want := hex.EncodeToString(h[:])
	if e := downloadVerified(server.URL, filepath.Join(t.TempDir(), "ok"), want); e != nil {
		t.Fatal(e)
	}
	if e := downloadVerified(server.URL, filepath.Join(t.TempDir(), "bad"), strings.Repeat("0", 64)); e == nil {
		t.Fatal("accepted checksum mismatch")
	}
	if e := downloadVerified("http://example.com/runtime", filepath.Join(t.TempDir(), "bad"), want); e == nil {
		t.Fatal("accepted remote plaintext HTTP")
	}
}

func TestInstallAtomicAndOfflineReuse(t *testing.T) {
	oldV, oldS, oldU := version, runtimeSHA, runtimeURL
	defer func() { version, runtimeSHA, runtimeURL = oldV, oldS, oldU }()
	version = "1.2.3"
	meta, _ := json.Marshal(metadata{version, runtime.GOOS + "-" + runtime.GOARCH})
	entries := []testEntry{{name: "runtime.json", body: string(meta)}}
	for _, p := range []string{"node/bin/node", "node/lib/node_modules/npm/bin/npm-cli.js", "bin/ffmpeg", "packages/cli/bin/clapper.mjs", "packages/core/package.json", "browsers/installed", "templates/basic/src/index.tsx"} {
		entries = append(entries, testEntry{name: p, body: "test"})
	}
	archive := makeArchive(t, entries)
	data, _ := os.ReadFile(archive)
	h := sha256.Sum256(data)
	runtimeSHA = hex.EncodeToString(h[:])
	t.Setenv("CLAPPER_HOME", t.TempDir())
	t.Setenv("CLAPPER_RUNTIME_URL", "file://"+archive)
	dir, e := ensureRuntime()
	if e != nil {
		t.Fatal(e)
	}
	t.Setenv("CLAPPER_RUNTIME_URL", "file:///does-not-exist")
	again, e := ensureRuntime()
	if e != nil || again != dir {
		t.Fatalf("offline cache failed: %s %v", again, e)
	}
	if e = os.Remove(filepath.Join(dir, "node/bin/node")); e != nil {
		t.Fatal(e)
	}
	if _, e = ensureRuntime(); e == nil {
		t.Fatal("accepted incomplete runtime")
	}
}

func TestChecksumFailureLeavesNoInstall(t *testing.T) {
	old := runtimeSHA
	defer func() { runtimeSHA = old }()
	runtimeSHA = strings.Repeat("0", 64)
	cache := t.TempDir()
	t.Setenv("CLAPPER_HOME", cache)
	file := makeArchive(t, []testEntry{{name: "hello", body: "world"}})
	t.Setenv("CLAPPER_RUNTIME_URL", "file://"+file)
	if _, e := ensureRuntime(); e == nil {
		t.Fatal("accepted corrupt payload")
	}
	if _, e := os.Stat(filepath.Join(cache, runtimeSHA)); !os.IsNotExist(e) {
		t.Fatal("failed install became visible")
	}
	entries, _ := os.ReadDir(cache)
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), ".install-") {
			t.Fatal("partial staging directory leaked")
		}
	}
}
