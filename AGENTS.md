# AGENTS.md — ig-reel-downloader

Guidance for AI coding agents (and humans) working on this repository.

## 🎯 What this repo is

One userscript, `ig-reel-downloader-userscript.user.js`, at the repo root. It reads the current reel/post payload and exposes the media URLs for copy or download.

## 🔌 Endpoint notes (API-first)

| Step | Request |
|------|---------|
| Shortcode → id | local base64url decode, alphabet `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_` |
| Media payload | `GET /api/v1/media/<id>/info/` → `items[0]` |
| Carousel | `items[0].carousel_media[]`, each with `image_versions2` or `video_versions` |

Headers:

```js
"x-ig-app-id": "936619743392459"
"x-csrftoken": <csrftoken cookie>
"x-requested-with": "XMLHttpRequest"
```

Why the local decode: the old `?__a=1&__d=dis` endpoint now needs auth cookies and returns HTML for many sessions. Shortcode is plain base64url of the pk, so `BigInt` accumulation is exact and dependency-free.

- Never trust `original_width`/`original_height` alone; fall back to the first candidate's dimensions.
- `video_versions[0].url` is the playable MP4; there is no separate audio file to merge.
- `@grant none`.

## 🧭 Golden rules

1. One file, zero dependencies, `@grant none`.
2. **Never fire while typing.** `isTyping()` guards the global keys; the URL field is an input.
3. Auto-load only when the shortcode actually changed (`state.lastCode`) — SPA re-renders fire the route tick often.
4. Always ship the sidecar JSON with a full download; attribution is part of the product.
5. Bump `@version` on functional changes.

## 🧪 Test with sctl

```bash
sctl install ./ig-reel-downloader-userscript.user.js
sctl page goto "https://www.instagram.com/reel/<shortcode>/"
sctl page eval "document.querySelectorAll('.igrd-item').length"
sctl page eval "document.querySelector('#igrd-meta').textContent"
sctl page click ".igrd-item .igrd-mini"     # copy first URL
sctl debug console --level error
```

Expected: one row per media file, `meta` shows `@author · n file(s) · shortcode`, no console errors.

## 🗂️ Layout

| File | Purpose |
|------|---------|
| `ig-reel-downloader-userscript.user.js` | The script. Edit this. |
| `README.md` | User-facing docs. |
| `okf/` | Generated scoped bundle. |

## 📌 Known fragility

- Signed CDN URLs expire; a stale panel will 403 on download. Reload the post.
- Reels sometimes arrive as `items[0]` with a `video_versions` entry only — never assume `image_versions2`.
- `/reels/<code>/` and `/reel/<code>/` both exist; the regex covers `p|reel|reels|tv`.

<!-- okf-requirement -->
## 📚 Documentation lives in ONE place (mandatory)

All documentation for every repository in this workspace is **single-sourced** in the
umbrella repository:

```
c:\ws\docs\okf├── bundle.md            collection overview
├── index.md             catalogue of every concept and script note
├── concepts/            shared knowledge (architecture, testing, metadata, …)
└── scripts/             one note per userscript repository
```

### Rules

1. **Never create an `okf/` folder in this repository.** It is not duplicated here, by
   design. There was once a copy in every repo: 278 files describing 42 unique documents,
   with `concepts/architecture.md` physically present 32 times. Every edit had to be
   propagated to 30 repositories and drift was unavoidable.
2. **Never hand-edit a copy.** There are no copies. Edit the canonical file under
   `c:\ws\docs\okf\`.
3. **This repository's note is** `c:\ws\docs\okf\scripts\<repo-name>.md`. If it does not
   exist, add it before adding the script.
4. **Link, do not paste.** In `README.md`, link to the canonical note with a relative path
   from the workspace, e.g. `[documentation](../../../../../docs/okf/scripts/<repo-name>.md)`.
5. **Verify** with `node c:\ws\scripts\check-okf.mjs` — it exits `0` only when nothing is
   duplicated and every repository is linked and documented.
6. When adding a new script: create the repo, add `docs/okf/scripts/<repo-name>.md`, add it
   to the tables in `docs/okf/bundle.md` and `docs/okf/index.md`, then run the checker.

Full detail: `c:\ws\docs\okf\concepts\okf-requirement.md`.
