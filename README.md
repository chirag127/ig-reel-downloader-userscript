# Instagram: Reel & Post Downloader

Lists every media file in the **current reel or post** — image and video, with resolution — and lets you copy or download each one, plus a sidecar JSON carrying the caption and author.

> Part of the [userscripts collection](https://github.com/chirag127?tab=repositories&q=userscript). One repo, one script.

## ✨ What it does

- 🔗 Detects `/p/`, `/reel/`, `/reels/` and `/tv/` URLs and loads automatically on navigation.
- 🧮 Decodes the shortcode to Instagram's numeric media id locally (base64url), so no deprecated `?__a=1`.
- 🖼️ Calls `/api/v1/media/<id>/info/` and lists **all** carousel items with type and pixel size.
- 📋 Copy one URL, copy all URLs, or copy the full sidecar JSON.
- ⬇️ Download a single file or the whole set; the JSON is written next to the files.
- 🖤 Draggable, resizable, collapsible panel; `Alt+Shift+D` downloads everything.

## 📦 Install

Read the [userscript install guide](https://github.com/chirag127/userscript-install-guide) once, then:

**[Install ig-reel-downloader-userscript.user.js](https://github.com/chirag127/ig-reel-downloader-userscript/raw/main/ig-reel-downloader-userscript.user.js)**

## 🕹️ Usage

1. Open a reel or post on `instagram.com`. The panel fills in the URL and loads the payload.
2. Or paste a URL/shortcode into the field and press **Load**.
3. Use **copy** / **save** per row, or **Download all + JSON**.
4. The JSON contains `shortcode`, `author`, `caption`, `taken_at` and every media entry.

## ⚠️ Limits

- Media must be **public** or from an account you follow. Private posts return `media info failed (401/404)`.
- `image_versions2` and `video_versions` are the exact CDN URLs Instagram served; they are signed and expire after a while. Re-load before re-downloading later.
- Carousel posts are flattened with a 1-based index; the order matches the post.
- Blob downloads need CDN CORS. If blocked, the file opens in a new tab where you can save it.
- The shortcode decoder only accepts the Instagram alphabet `A–Z a–z 0–9 - _`.

## 🚨 Risk note

Read-only. No likes, saves or follows are created. Downloading does not notify the author. Respect the author's rights when republishing.

## 🧠 Docs

Endpoint notes and rules: [AGENTS.md](AGENTS.md). Knowledge bundle: [okf/index.md](../../../../../docs/okf/index.md).

## 📄 License

[MIT](LICENSE) © 2026 chirag127

<!-- docs-single-source -->
## 📚 Documentation

Documentation for this repository lives in the umbrella workspace, in exactly **one** place:

| What | Where |
|------|-------|
| This script's note | [`docs/okf/scripts/ig-reel-downloader-userscript.md`](../../../../../docs/okf/scripts/ig-reel-downloader-userscript.md) |
| All notes, catalogued | [`docs/okf/index.md`](../../../../../docs/okf/index.md) |
| Shared knowledge | [`docs/okf/concepts/`](../../../../../docs/okf/concepts/) |

It is **not** copied into this repository. Nothing in this workspace is duplicated: one
document, one file. Verify with `node c:\ws\scripts\check-okf.mjs`.
