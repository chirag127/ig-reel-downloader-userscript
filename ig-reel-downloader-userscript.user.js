// ==UserScript==
// @name         Instagram: Reel & Post Downloader
// @namespace    https://github.com/chirag127
// @version      1.0.0
// @description  Lists every media URL in the current reel or post through Instagram's media info API, with resolution and type, so you can copy or download each file plus a sidecar JSON carrying caption and author.
// @author       chirag127
// @license      MIT
// @match        https://www.instagram.com/*
// @icon         https://www.instagram.com/favicon.ico
// @homepageURL  https://github.com/chirag127/ig-reel-downloader-userscript
// @supportURL   https://github.com/chirag127/ig-reel-downloader-userscript/issues
// @downloadURL  https://github.com/chirag127/ig-reel-downloader-userscript/raw/main/ig-reel-downloader-userscript.user.js
// @updateURL    https://github.com/chirag127/ig-reel-downloader-userscript/raw/main/ig-reel-downloader-userscript.user.js
// @grant        none
// @noframes
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const APP_ID = "936619743392459";
  const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const state = { media: null, route: "", lastCode: "", busy: false };

  /* ---------- utils ---------- */

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function cookie(name) {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }

  function isTyping() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = (el.tagName || "").toUpperCase();
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  }

  function h(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") n.className = v;
      else if (k === "style") Object.assign(n.style, v);
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) n.setAttribute(k, v);
    }
    for (const kid of kids.flat()) {
      if (kid == null) continue;
      n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return n;
  }

  function api(path) {
    return fetch(path, {
      credentials: "include",
      headers: {
        "x-ig-app-id": APP_ID,
        "x-csrftoken": cookie("csrftoken"),
        "x-requested-with": "XMLHttpRequest",
        "referer": location.href
      }
    }).then(async (r) => {
      let data = null;
      try { data = await r.json(); } catch { /* non-JSON */ }
      return { ok: r.ok, status: r.status, data };
    });
  }

  // Instagram shortcodes are base64url of the numeric media pk. Decoding locally
  // avoids the deprecated ?__a=1 endpoint and any DOM scraping.
  function shortcodeToId(code) {
    let n = 0n;
    for (const ch of code) {
      const v = B64.indexOf(ch);
      if (v < 0) throw new Error("invalid shortcode");
      n = n * 64n + BigInt(v);
    }
    return n.toString();
  }

  function codeFromUrl() {
    const m = location.pathname.match(/^\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : "";
  }

  function log(msg, kind = "info") {
    const box = document.querySelector("#igrd-log");
    if (!box) return;
    box.prepend(h("div", { class: "igrd-" + kind }, `${new Date().toLocaleTimeString()}  ${msg}`));
    while (box.childElementCount > 80) box.lastChild.remove();
  }

  function best(candidates) {
    if (!candidates || !candidates.length) return "";
    return candidates.reduce((a, b) => ((b.width || 0) * (b.height || 0) > (a.width || 0) * (a.height || 0) ? b : a)).url;
  }

  /* ---------- data ---------- */

  function flatten(item) {
    const parts = item.carousel_media && item.carousel_media.length ? item.carousel_media : [item];
    return parts.map((p, i) => ({
      index: i + 1,
      type: p.video_versions ? "video" : "image",
      width: p.original_width || (p.image_versions2 && p.image_versions2.candidates[0] && p.image_versions2.candidates[0].width) || 0,
      height: p.original_height || (p.image_versions2 && p.image_versions2.candidates[0] && p.image_versions2.candidates[0].height) || 0,
      url: p.video_versions ? p.video_versions[0].url : best(p.image_versions2 && p.image_versions2.candidates)
    }));
  }

  async function load(code) {
    code = (code || "").trim().replace(/^.*\/(?:p|reel|reels|tv)\//, "").replace(/[/?#].*$/, "");
    if (!code) { log("no reel or post in this URL", "warn"); return; }
    if (state.busy) return;
    state.busy = true;
    log(`resolving ${code}…`);
    try {
      const id = shortcodeToId(code);
      const res = await api(`/api/v1/media/${id}/info/`);
      if (!res.ok || !res.data || !res.data.items || !res.data.items.length) {
        log(`media info failed (${res.status}) — is this post public?`, "bad");
        return;
      }
      const item = res.data.items[0];
      state.media = {
        code, id,
        author: (item.user || item.owner || {}).username || "unknown",
        caption: (item.caption && item.caption.text) || "",
        takenAt: item.taken_at || 0,
        parts: flatten(item)
      };
      state.lastCode = code;
      paint();
      log(`${state.media.parts.length} file(s) from @${state.media.author}`, "good");
    } catch (e) {
      log(`could not decode shortcode: ${e.message}`, "bad");
    } finally {
      state.busy = false;
    }
  }

  /* ---------- files ---------- */

  function ext(part) {
    return part.type === "video" ? "mp4" : "jpg";
  }

  function name(part) {
    const m = state.media;
    return `ig-${m.author}-${m.code}-${String(part.index).padStart(2, "0")}.${ext(part)}`;
  }

  function sidecar() {
    const m = state.media;
    return JSON.stringify({
      platform: "instagram",
      shortcode: m.code,
      media_id: m.id,
      author: m.author,
      url: `https://www.instagram.com/p/${m.code}/`,
      taken_at: m.takenAt,
      taken_at_iso: m.takenAt ? new Date(m.takenAt * 1000).toISOString() : null,
      caption: m.caption,
      media: m.parts.map((p) => ({ index: p.index, type: p.type, width: p.width, height: p.height, url: p.url })),
      saved_at: new Date().toISOString()
    }, null, 2);
  }

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      log(`copied ${label}`, "good");
    } catch {
      const ta = h("textarea", { style: { position: "fixed", opacity: "0" } });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      log(`copied ${label}`, "good");
    }
  }

  async function save(url, filename) {
    try {
      const r = await fetch(url, { credentials: "omit" });
      if (!r.ok) throw new Error(r.status);
      const blob = await r.blob();
      const a = h("a", { href: URL.createObjectURL(blob), download: filename });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 20000);
      log(`saved ${filename}`, "good");
    } catch {
      window.open(url, "_blank");
      log(`blob fetch blocked — opened ${filename} in a tab`, "warn");
    }
  }

  async function saveAll() {
    if (!state.media) return;
    for (const part of state.media.parts) {
      await save(part.url, name(part));
      await sleep(300);
    }
    await save(URL.createObjectURL(new Blob([sidecar()], { type: "application/json" })), `ig-${state.media.author}-${state.media.code}.json`);
  }

  /* ---------- panel ---------- */

  let panel, chip, list, caption, meta;

  function build() {
    if (document.getElementById("igrd-panel")) return;
    panel = h("div", { id: "igrd-panel" },
      h("div", { class: "igrd-hdr" },
        h("span", { class: "igrd-dot" }),
        h("strong", {}, "Reel downloader"),
        h("span", { class: "igrd-spacer" }),
        h("button", { class: "igrd-min", title: "Collapse", onclick: collapse }, "–"),
        h("button", { class: "igrd-x", title: "Hide", onclick: () => { panel.style.display = "none"; chip.style.display = "block"; } }, "×")
      ),
      h("div", { class: "igrd-body" },
        h("form", { class: "igrd-row", onsubmit: (e) => { e.preventDefault(); load(panel.querySelector("#igrd-code").value); } },
          h("input", { id: "igrd-code", type: "text", placeholder: "reel / post URL or shortcode", autocomplete: "off" }),
          h("button", { class: "igrd-btn", type: "submit" }, "Load")
        ),
        meta = h("div", { class: "igrd-meta" }, "Nothing loaded"),
        caption = h("div", { class: "igrd-cap" }, ""),
        h("div", { class: "igrd-row" },
          h("button", { class: "igrd-btn igrd-ghost", onclick: saveAll }, "Download all + JSON"),
          h("button", { class: "igrd-btn igrd-ghost", onclick: () => state.media && copy(state.media.parts.map((p) => p.url).join("\n"), "all URLs") }, "Copy all URLs"),
          h("button", { class: "igrd-btn igrd-ghost", onclick: () => state.media && copy(sidecar(), "sidecar JSON") }, "Copy JSON")
        ),
        h("div", { class: "igrd-scroll" }, list = h("div", { class: "igrd-list" })),
        h("div", { class: "igrd-log", id: "igrd-log" })
      )
    );
    Object.assign(panel.style, { position: "fixed", right: "18px", bottom: "18px", width: "400px", height: "460px" });
    chip = h("button", { id: "igrd-chip", onclick: () => { chip.style.display = "none"; panel.style.display = "flex"; } }, "IG · download");
    document.body.append(panel, chip);
    chip.style.display = "none";
    drag(panel.querySelector(".igrd-hdr"), panel);
  }

  function paint() {
    const m = state.media;
    if (!m) return;
    meta.textContent = `@${m.author} · ${m.parts.length} file(s) · ${m.code}`;
    caption.textContent = m.caption || "(no caption)";
    list.textContent = "";
    for (const part of m.parts) {
      list.append(h("div", { class: "igrd-item" },
        h("span", { class: "igrd-idx" }, String(part.index)),
        h("span", { class: "igrd-type " + part.type }, part.type === "video" ? "▶ video" : "▣ image"),
        h("span", { class: "igrd-res" }, `${part.width}×${part.height}`),
        h("span", { class: "igrd-spacer" }),
        h("button", { class: "igrd-mini", title: "Copy URL", onclick: () => copy(part.url, `URL ${part.index}`) }, "copy"),
        h("button", { class: "igrd-mini", title: "Download", onclick: () => save(part.url, name(part)) }, "save")
      ));
    }
  }

  function collapse() {
    panel.classList.toggle("igrd-collapsed");
    panel.querySelector(".igrd-min").textContent = panel.classList.contains("igrd-collapsed") ? "+" : "–";
  }

  function drag(handle, box) {
    let on = false, sx = 0, sy = 0, ox = 0, oy = 0;
    handle.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      on = true; sx = e.clientX; sy = e.clientY;
      const r = box.getBoundingClientRect(); ox = r.left; oy = r.top;
      box.style.right = "auto"; box.style.bottom = "auto";
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener("pointermove", (e) => {
      if (!on) return;
      box.style.left = Math.max(0, Math.min(innerWidth - 60, ox + e.clientX - sx)) + "px";
      box.style.top = Math.max(0, Math.min(innerHeight - 40, oy + e.clientY - sy)) + "px";
    });
    handle.addEventListener("pointerup", () => (on = false));
  }

  /* ---------- route ---------- */

  function routeTick() {
    if (location.href === state.route) return;
    state.route = location.href;
    if (!document.getElementById("igrd-panel")) build();
    else if (!document.body.contains(panel)) document.body.append(panel, chip);
    const code = codeFromUrl();
    if (code && code !== state.lastCode) {
      panel.querySelector("#igrd-code").value = location.origin + location.pathname;
      load(code);
    }
  }

  function boot() {
    if (document.documentElement.dataset.igrdBooted) return;
    document.documentElement.dataset.igrdBooted = "1";
    document.head.append(h("style", {}, `
      #igrd-panel,#igrd-chip{font:12px/1.45 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#e8e8e8;background:#181818;border:1px solid #2c2c2c;border-radius:10px;box-shadow:0 12px 40px #000a;z-index:2147483000}
      #igrd-panel{display:flex;flex-direction:column;overflow:hidden;resize:both;min-width:320px;min-height:280px}
      #igrd-panel.igrd-collapsed{height:auto!important;resize:none}
      #igrd-panel.igrd-collapsed .igrd-body{display:none}
      .igrd-hdr{display:flex;align-items:center;gap:8px;padding:9px 10px;background:#111;border-bottom:1px solid #2c2c2c;cursor:grab;user-select:none}
      .igrd-dot{width:8px;height:8px;border-radius:50%;background:#065fd4;box-shadow:0 0 0 3px #065fd433}
      .igrd-spacer{flex:1}
      .igrd-hdr button{background:none;border:0;color:#aaa;font-size:15px;cursor:pointer}
      .igrd-body{display:flex;flex-direction:column;gap:8px;padding:10px;overflow:hidden;flex:1;min-height:0}
      .igrd-row{display:flex;gap:6px}
      #igrd-code{flex:1;background:#111;border:1px solid #333;color:#eee;border-radius:6px;padding:6px 8px;font-size:11px;outline:none;min-width:0}
      #igrd-code:focus{border-color:#065fd4}
      .igrd-btn{background:#065fd4;border:1px solid #065fd4;color:#fff;border-radius:6px;padding:6px 9px;font-size:11px;cursor:pointer}
      .igrd-ghost{background:#222;border-color:#333;color:#ddd}
      .igrd-meta{color:#9a9a9a;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .igrd-cap{color:#c9c9c9;font-size:11px;max-height:48px;overflow:auto;background:#141414;border-left:2px solid #065fd4;padding:4px 6px;border-radius:0 4px 4px 0}
      .igrd-scroll{flex:1;min-height:80px;overflow:auto;border:1px solid #262626;border-radius:6px}
      .igrd-item{display:flex;align-items:center;gap:7px;padding:6px 7px;border-bottom:1px solid #222}
      .igrd-idx{color:#777;width:16px;text-align:right}
      .igrd-type{font-size:10px;padding:1px 5px;border-radius:999px;background:#242424;color:#bbb}
      .igrd-type.video{background:#3a2410;color:#f0a44a}
      .igrd-res{color:#8f8f8f;font-size:10px}
      .igrd-mini{background:#242424;border:1px solid #333;color:#ddd;border-radius:4px;padding:2px 7px;font-size:10px;cursor:pointer}
      .igrd-mini:hover{background:#333}
      .igrd-log{height:80px;overflow:auto;background:#101010;border:1px solid #262626;border-radius:6px;padding:5px;font:10px/1.5 ui-monospace,Consolas,monospace}
      .igrd-good{color:#5fd68a}.igrd-bad{color:#ff7b72}.igrd-warn{color:#f0b429}
      #igrd-chip{position:fixed;right:18px;bottom:18px;display:none;background:#181818;color:#fff;border:1px solid #065fd4;border-radius:999px;padding:7px 12px;font-size:11px;cursor:pointer}
    `));
    build();
    routeTick();
    new MutationObserver(() => {
      if (panel && !document.body.contains(panel) && document.body) document.body.append(panel);
    }).observe(document.documentElement, { childList: true, subtree: true });
    setInterval(routeTick, 700);

    document.addEventListener("keydown", (e) => {
      if (isTyping()) return;
      if (e.key === "Escape") { panel.style.display = "none"; chip.style.display = "block"; }
      if (e.altKey && e.key.toLowerCase() === "d" && state.media) { e.preventDefault(); saveAll(); }
    }, true);
  }

  boot();
})();
