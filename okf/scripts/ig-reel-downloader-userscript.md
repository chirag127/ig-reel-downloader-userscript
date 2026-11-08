---
type: Script
title: Instagram — Reel and post downloader
description: Lists every media URL in the current reel or post with resolution, plus a caption/author sidecar JSON.
repo: https://github.com/chirag127/ig-reel-downloader-userscript
install: https://github.com/chirag127/ig-reel-downloader-userscript/raw/main/ig-reel-downloader-userscript.user.js
version: "1.0.0"
tags: [userscript, instagram, download, reels, media]
timestamp: 2026-11-09T00:00:00Z
---

# Instagram — Reel and post downloader

Decodes the URL shortcode to the numeric media pk locally (base64url alphabet), then
requests `/api/v1/media/<pk>/info/`. Carousel children are flattened into numbered rows
with type, width and height.

## Method

| Step | Call |
|------|------|
| Shortcode → pk | local `BigInt` base64url decode |
| Payload | `GET /api/v1/media/<pk>/info/` |
| Files | `image_versions2.candidates[].url`, `video_versions[0].url` |

Copy, per-file save and download-all are offered; the JSON sidecar carries `shortcode`,
`author`, `caption`, `taken_at` and every media entry. `@grant none`.

## Limitations

- Public or followed content only; private posts answer 401/404.
- CDN URLs are signed and expire — reload before a later re-download.
- Blob saves need CDN CORS; blocked saves open a tab.
- The local decode avoids the now-authenticated `?__a=1` endpoint.

## Risk

Read-only. No like, save or follow is created and the author is not notified.
