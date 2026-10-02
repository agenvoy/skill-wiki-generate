# Template Changelog

`build.js` 的 `TEMPLATE_VERSION` 與本檔最新版號一致。每次修改 `build.js`／`docs.css`／`sync-tags.js` 都要升版並在此新增一節；移除的行為寫在 `Removed`，不刪舊節。

## 1.5.0 (2026-10-02)

### Added
- `AI_TRAIN`／`AI_INPUT`／`AI_SEARCH`（R13）：robots.txt 的 `User-agent: *` 群組輸出 IETF aipref `Content-Usage: train-ai=…, ai-use=…, search=…`（draft-ietf-aipref-attach-05）與 Cloudflare `Content-signal: search=…, ai-input=…, ai-train=…`；`_headers` 對 `/*` 加 `Content-Usage` header。值為空字串時不輸出

## 1.4.0 (2026-10-02)

### Added
- `stampDates()`＋`public/docs/dates.json`：每頁以內容 SHA-256 判斷是否變動，維護 `published`／`modified`；JSON-LD `TechArticle`／`SoftwareSourceCode` 帶 `datePublished`／`dateModified`，署名列可見顯示「Last updated／最後更新」（版本頁顯示 `Released`，取 release 日期）
- `ORG_NAME_ZH`：Organization 依頁面語言輸出名稱，另一語言進 `alternateName`；署名列同步
- `ORG_SAME_AS`：Organization `sameAs` 改由設定提供
- `indexnow.js`：`--ensure-key` 產生 key 檔，部署後只送 `lastmod` 有變的 URL；`package.json` 的 `deploy` 串接兩者

### Changed
- sitemap `lastmod` 改取 `dates.json`，不再用檔案 mtime 或建置當天

### Removed
- Organization `sameAs` 固定為 `https://github.com/{owner}`（1.0.0–1.3.0）：owner 是個人帳號，不是組織

## 1.3.0 (2026-10-02)

### Added
- 署名列加上可見的 `llms.txt` 與本頁 Markdown 連結：fetch 工具把 HTML 轉成 Markdown 後連結仍在，不跟隨 `<head>` link 的 agent 也找得到
- `llms.txt` 新增 `## Symbols`：每個公開符號 → 記載它的參考頁與概念頁（讀 `public/docs/symbols.json`，由 `check_coverage.py --write-symbols` 產生；含 `Removed in`／`移除於` 的列不計入）
- `/llms-full.txt`（EN）與 `/zh/llms-full.txt`（ZH）：依導覽順序串接全部頁面，每段標示來源 URL；`llms.txt` 開頭連結兩者

### Changed
- `_headers` 的 charset 規則由 `/llms.txt` 擴大為 `/*.txt`，涵蓋 `llms-full.txt`

## 1.2.1 (2026-10-02)

### Fixed
- 產出 `public/_headers`：`/*.md` 與 `/llms.txt` 的 `Content-Type` 加上 `charset=utf-8`。Workers static assets 預設回 `text/markdown`／`text/plain` 不帶 charset，瀏覽器以 Latin-1 解碼，中文全成亂碼（1.2.0 的 Markdown 版與 1.0.0 起的 llms.txt 皆受影響）

## 1.2.0 (2026-10-02)

### Added
- `TEMPLATE_VERSION` 常數；build 結束時輸出範本版號
- llms.txt v2 探索機制（llmstxt.org，2026-08-10）：每頁 `<link rel="alternate" type="text/markdown">` 指向該頁 Markdown 版、`<link rel="describedby">` 指向 `/llms.txt`
- 每頁輸出 Markdown 版：`/index.md`、`/<slug>.md`、`/zh/index.md`、`/zh/<slug>.md`、`/released/<tag>.md`、`/released/index.md`

### Changed
- `llms.txt` 的連結改指向 Markdown 版（v2：連結應指向 LLM 友善內容）

### Removed
- `llms.txt` 連結指向 HTML 頁（1.0.0–1.1.0）

## 1.1.0 (2026-10-02)

### Added
- `revealNav()`：載入時與手機選單展開時把側欄捲到當前頁
- `docs.css`：側欄隱藏 scrollbar

## 1.0.0 (2026-09-21)

### Added
- 編譯成靜態文件站（EN／ZH）、版本紀錄 `/released/`
- 內建 SEO／AEO：title、description、JSON-LD `@graph`、OG／Twitter、hreflang、sitemap、robots、llms.txt、署名列
- `TAGLINE`：署名列與 llms.txt 的定位文字
