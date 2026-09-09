package main

import (
	"archive/tar"
	"compress/gzip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

func inside(root, name string) (string, error) {
	if filepath.IsAbs(name) {
		return "", fmt.Errorf("absolute archive path: %s", name)
	}
	p := filepath.Join(root, name)
	rel, err := filepath.Rel(root, p)
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(os.PathSeparator)) {
		return "", fmt.Errorf("archive path escapes runtime: %s", name)
	}
	return p, nil
}

// Links are created last. No archive file can be written through an archive
// symlink, and every link target must remain within the extracted runtime.
func extractArchive(archive, root string) error {
	f, err := os.Open(archive)
	if err != nil {
		return err
	}
	defer f.Close()
	gz, err := gzip.NewReader(f)
	if err != nil {
		return err
	}
	defer gz.Close()
	tr := tar.NewReader(gz)
	type link struct {
		path, target string
		hard         bool
	}
	links := []link{}
	var size int64
	for {
		h, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		p, err := inside(root, h.Name)
		if err != nil {
			return err
		}
		if p == root {
			if h.Typeflag == tar.TypeDir {
				continue
			}
			return fmt.Errorf("invalid archive root")
		}
		switch h.Typeflag {
		case tar.TypeDir:
			if err = os.MkdirAll(p, 0755); err != nil {
				return err
			}
		case tar.TypeReg, tar.TypeRegA:
			size += h.Size
			if h.Size < 0 || size > 8<<30 {
				return fmt.Errorf("expanded runtime too large")
			}
			if err = os.MkdirAll(filepath.Dir(p), 0755); err != nil {
				return err
			}
			out, e := os.OpenFile(p, os.O_CREATE|os.O_EXCL|os.O_WRONLY, os.FileMode(h.Mode)&0777)
			if e != nil {
				return e
			}
			_, e = io.Copy(out, tr)
			ce := out.Close()
			if e != nil {
				return e
			}
			if ce != nil {
				return ce
			}
		case tar.TypeSymlink, tar.TypeLink:
			targetName := h.Linkname
			if h.Typeflag == tar.TypeSymlink {
				if filepath.IsAbs(h.Linkname) {
					return fmt.Errorf("absolute symlink target")
				}
				targetName = filepath.Join(filepath.Dir(h.Name), h.Linkname)
			}
			target, e := inside(root, targetName)
			if e != nil {
				return e
			}
			links = append(links, link{p, target, h.Typeflag == tar.TypeLink})
		default:
			return fmt.Errorf("unsupported archive entry %s (type %d)", h.Name, h.Typeflag)
		}
	}
	for _, l := range links {
		if err = os.MkdirAll(filepath.Dir(l.path), 0755); err != nil {
			return err
		}
		// Reject a parent symlink, even when it points internally.
		for p := filepath.Dir(l.path); p != root; p = filepath.Dir(p) {
			s, e := os.Lstat(p)
			if e != nil {
				return e
			}
			if s.Mode()&os.ModeSymlink != 0 {
				return fmt.Errorf("symlink parent in archive")
			}
		}
		if l.hard {
			s, e := os.Lstat(l.target)
			if e != nil {
				return e
			}
			if !s.Mode().IsRegular() {
				return fmt.Errorf("invalid hardlink target")
			}
			err = os.Link(l.target, l.path)
		} else {
			rel, _ := filepath.Rel(filepath.Dir(l.path), l.target)
			err = os.Symlink(rel, l.path)
		}
		if err != nil {
			return err
		}
	}
	return nil
}
