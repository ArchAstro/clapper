// Clapper's launcher has no runtime dependency on Node, npm, curl or tar.
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
)

// Set by the release builder. The digest is pinned in the executable, not
// fetched from the same location as an untrusted archive.
var version = "dev"
var runtimeSHA = ""
var runtimeURL = ""

type metadata struct {
	Version  string `json:"version"`
	Platform string `json:"platform"`
}

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "clapper:", err)
		os.Exit(1)
	}
}

func run(args []string) error {
	if len(args) == 0 || args[0] == "--help" || args[0] == "-h" {
		fmt.Printf("Clapper %s — React videos, no system Node required\n\n", version)
		fmt.Println("  clapper new <directory> [--template basic|comic]\n  clapper install              Restore project dependencies\n  clapper add <package...>     Add npm packages (scripts disabled by default)\n  clapper preview              Open the studio\n  clapper render | still | compositions | cues | review\n  clapper doctor               Check the managed toolchain\n  clapper runtime path         Install/locate the pinned runtime\n\nProject commands read clapper.json. Use <command> --help for render options.")
		return nil
	}
	if args[0] == "--version" || args[0] == "version" {
		fmt.Println(version)
		return nil
	}
	if runtime.GOOS != "darwin" && runtime.GOOS != "linux" {
		return fmt.Errorf("unsupported platform %s", runtime.GOOS)
	}
	if err := checkProjectVersion(); err != nil {
		return err
	}
	dir, err := ensureRuntime()
	if err != nil {
		return err
	}
	if args[0] == "runtime" {
		if len(args) != 2 || args[1] != "path" {
			return fmt.Errorf("usage: clapper runtime path")
		}
		fmt.Println(dir)
		return nil
	}
	// exec preserves terminal ownership, signals, and the CLI's exit status.
	node := filepath.Join(dir, "node", "bin", "node")
	env := cleanEnv(os.Environ(), []string{"CLAPPER_RUNTIME", "CLAPPER_VERSION", "CLAPPER_FFMPEG", "PLAYWRIGHT_BROWSERS_PATH", "PATH", "NODE_PATH", "NODE_OPTIONS"})
	env = append(env, "CLAPPER_RUNTIME="+dir, "CLAPPER_VERSION="+version,
		"CLAPPER_FFMPEG="+filepath.Join(dir, "bin", "ffmpeg"),
		"PLAYWRIGHT_BROWSERS_PATH="+filepath.Join(dir, "browsers"),
		"PATH="+filepath.Join(dir, "node", "bin")+string(os.PathListSeparator)+os.Getenv("PATH"))
	return syscall.Exec(node, append([]string{node, filepath.Join(dir, "packages", "cli", "bin", "clapper.mjs")}, args...), env)
}

func cleanEnv(env, keys []string) []string {
	out := []string{}
	for _, e := range env {
		keep := true
		for _, k := range keys {
			if strings.HasPrefix(e, k+"=") {
				keep = false
				break
			}
		}
		if keep {
			out = append(out, e)
		}
	}
	return out
}

func checkProjectVersion() error {
	dir, err := os.Getwd()
	if err != nil {
		return err
	}
	for {
		b, err := os.ReadFile(filepath.Join(dir, "clapper.json"))
		if err == nil {
			var config struct {
				Runtime string `json:"runtime"`
			}
			if err := json.Unmarshal(b, &config); err != nil {
				return fmt.Errorf("invalid clapper.json: %w", err)
			}
			if config.Runtime != version {
				return fmt.Errorf("project pins Clapper %q; this launcher is %s. Install the matching launcher from ArchAstro/clapper releases", config.Runtime, version)
			}
			return nil
		}
		if !os.IsNotExist(err) {
			return err
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return nil
		}
		dir = parent
	}
}

func validateRuntime(dir string) error {
	b, err := os.ReadFile(filepath.Join(dir, "runtime.json"))
	if err != nil {
		return err
	}
	var m metadata
	if err := json.Unmarshal(b, &m); err != nil {
		return err
	}
	if m.Version != version || m.Platform != runtime.GOOS+"-"+runtime.GOARCH {
		return fmt.Errorf("runtime version/platform mismatch")
	}
	for _, p := range []string{"node/bin/node", "node/lib/node_modules/npm/bin/npm-cli.js", "bin/ffmpeg", "packages/cli/bin/clapper.mjs", "packages/core/package.json", "browsers", "templates/basic/src/index.tsx"} {
		if _, err := os.Stat(filepath.Join(dir, p)); err != nil {
			return fmt.Errorf("incomplete runtime (%s): %w", p, err)
		}
	}
	return nil
}
