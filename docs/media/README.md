# Clapper README intro

- `clapper-intro.mp4`: approved 25-second 1080p H.264/AAC export, committed directly (not LFS).
- SHA-256: `2a56ace62605596195a0a1dff036605985ec9d8923b9db4fe0ae066d225bcf60`.
- `clapper-intro.png`: 1200×675 preview, frame 60 (2 seconds) from that exact export. README alt text describes the code-to-animation/music demo; clicking opens the MP4.
- Source, original score and review record: [`videos/clapper-intro`](../../videos/clapper-intro).

Regenerate the preview from the committed MP4 using Clapper's encoder:

```sh
.clapper/toolchain/ffmpeg/install/bin/ffmpeg -i docs/media/clapper-intro.mp4 -vf 'select=eq(n\,60),scale=1200:-1' -frames:v 1 docs/media/clapper-intro.png
```

This is a frame extraction, not a new video encode. Re-rendering the film requires a new review and hash; do not silently replace the approved movie while refreshing its thumbnail. The README keeps a repository-file fallback so the video remains available in a checkout.

Playback uses jsDelivr's GitHub CDN, pinned to the commit containing this exact MP4. GitHub raw files are served as `application/octet-stream`; the CDN serves the unchanged file as `video/mp4` with byte-range support, so the README link opens a browser video player. It is click-to-play, not an inline GitHub attachment. If replacing the approved movie, update the pinned commit only after verification; retain the repository-file fallback.
