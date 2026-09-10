# Licenses and attribution

Clapper's original code, documentation and code-generated examples are MIT licensed; see LICENSE. Third-party material keeps its own license and is not relicensed by this repository's MIT license.

1. **Fonts:** the WOFF2 files under `videos/*/src/fonts` are distributed under SIL Open Font License 1.1. Their family-specific copyright/license texts and file inventory are in `third-party/fonts`. Do not remove those notices when redistributing the fonts.
2. **Instrument samples:** the catalogued VSCO 2 CE, Karoryfer guitar/bass and Virtuosity Drums recordings are CC0. Samples are downloaded on demand, not committed here. The catalog pins upstream revisions and content hashes, and the installer keeps the source license and mapping files. Generated rock mappings are documented in `videos/animal-rock/README.md`.
3. **Native music engine:** sfizz is BSD-2-Clause with separately licensed dependencies. Release bundles include its matching source archive, build recipe and patch description, which retain dependency licenses.
4. **Video encoder:** release bundles use a pinned, source-built FFmpeg with libx264, without `--enable-nonfree`. The resulting encoder is GPL-2.0-or-later. It runs as a separate executable; Clapper's own code remains MIT. Matching FFmpeg/x264 source archives, license texts, configuration and build script are included with the runtime. Preserve these materials when redistributing a runtime.
5. **Other bundled dependencies:** Node/npm, Chromium/Playwright and JavaScript libraries retain their upstream license files. Runtime builds generate a dependency/license inventory. License identifiers summarize the inventory; the included license texts control.

ArchAstro, ArchDev, Intern and other product names/logos used in examples remain trademarks of their respective owners. The MIT license grants no trademark rights or endorsement. Branded examples are demonstrations; their copy, prices and product claims may be historical or illustrative. No private service or account is needed to build these examples.
