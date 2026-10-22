# Template Changelog

完整規範以 `SKILL.md` 與 `scripts/templates/` 為準（＝最新規範）；本檔只用於快速定位專案現有檔案與最新範本的差異，命中即直接修改專案。

最新改動：2026-10-23

## 破壞性變更

- `worker.js` 不再把 404 一律 302 轉回 `/`：改讀 `redirects.json` 回 301，其餘不存在的網址回 `404.html`／`zh/404.html`（狀態碼 404，含專案介紹，noindex）；build 新增 404 頁，並在已上線頁面（`dates.json`）消失卻不在 `redirects.json`／`removed.json` 時以 `[Conflict]` 中止 → 先詢問使用者同意換掉舊 `worker.js`，再複製範本 `worker.js`，`redirects.json`（`{}`）、`removed.json`（`[]`）不存在才建立；build 回報消失的網址逐一詢問要 301 還是移除

- SEO 值不再寫在 `build.js`：`PERSON_*`／`SAME_AS`／`ORG_*`／`TAGLINE`／`OG_IMAGE`／`FAVICON`／`HOME_TITLE*`／`PROGRAMMING_LANGUAGE`／`LICENSE_URL`／`AI_*`／`X_DEFAULT`／`BRAND_KEYWORDS` 常數與 `DESCRIPTIONS`／`DESCRIPTIONS_ZH`／`KEYWORDS`／`KEYWORDS_ZH` 物件移除，改讀 `wiki-worker/seo.json`（由 `/seo-optimize` 維護）→ 重新複製 `build.js` 前先跑 `node {skill_dir}/scripts/migrate_seo_json.js <舊 build.js> wiki-worker/seo.json` 保留現值；缺 `seo.json` 時 build 只輸出內容頁，不產生 meta、JSON-LD、sitemap、robots.txt、llms.txt

- 範例 iframe 高度以 `documentElement.scrollHeight` 計算（不低於 iframe 本身高度，內容變短時不會縮回），iframe 內可捲動且 log 限高 160px → 改以 `body` 實際高度設定、`html,body` 與 log 一律 `overflow:hidden` 不限高；`demo.js` 整檔覆蓋即取得
- `stampDates()` 只雜湊 Markdown 原文，改 title／description／keywords／JSON-LD 不更新 `dateModified`、sitemap `lastmod` → `renderPage` 的 `dates` 改收函式，雜湊納入 meta 與不含日期的 JSON-LD；重新複製 `build.js` 即取得，首次 build 全部文件頁 `modified` 會更新為當日
- `sitemap.xml` 輸出 `<changefreq>`／`<priority>`（Google 忽略，seo-optimize 研究報告 2026-10-21 列為過時參數）→ 移除，只留 `<loc>` 與 `<lastmod>`；重新複製 `build.js` 即取得
- `/released/` 索引頁 canonical 由 `{DOMAIN}/released`（無結尾斜線，伺服器 307 轉址，與 sitemap 的 `/released/` 不一致）改為 `{DOMAIN}/released/`；重新複製 `build.js` 即取得
- 不存在的路徑改為 302 轉回 `/`：複製範本 `worker.js` 到 `wiki-worker/worker.js`，`wrangler.toml` 加 `main = "worker.js"` 與 `[assets]` 下的 `binding = "ASSETS"`；缺任一項時 404 仍回 Cloudflare 預設錯誤頁
- NanoMD 版本改由 `nanomd/version.json` 記錄，`parser.css` 改內嵌 `nanomd/parser.css`（不再讀 node_modules）；複製 `sync-nanomd.js` 並執行 `node sync-nanomd.js`，`package.json` scripts 加 `sync-nanomd`，否則 build 以 `[Not found]` 中止
- 頁面內容改由 `@pardnchiu/nanomd` 在 build 時渲染（`Parse().html()`），進入頁面後載入同版本 `parser.js` 並執行 `MDParser.Init()`＋`Refresh()`，取代 `marked` 與 mermaid ESM 腳本；`wiki-worker/package.json` 相依改為 `@pardnchiu/nanomd` 後重跑 `npm install`；內容樣式改由 `parser.css` 提供，`docs.css` 移除 `.content h1`～`hr`／`table-scroll` 等內容規則（整檔覆蓋即取得）；`demo.js` 改讀 `code li` 逐行組回程式碼（整檔覆蓋即取得）
- 非首頁 title 移除作者名（`{label} - {SITE_NAME} Docs - {AUTHOR_NAME}` → `{label} - {SITE_NAME} Docs`，ZH 同理），`AUTHOR_NAME_ZH` 常數移除；專案 `build.js` 中的 `const AUTHOR_NAME_ZH = ...` 一併刪除。依據 seo-optimize knowledge_anchors A8：人名入 title 僅限首頁或作者頁，作者歸屬由署名列、`meta author` 與 JSON-LD `author` 表達
- 最後更新日期從署名列移到 h1 下方（`<p class="page-date">`）；署名列不再含日期。`docs.css` 新增 `.content .page-date`（整檔覆蓋即取得）；`pages/home*.md` 若含 README 的 `Last updated:`／`最後更新：` 行 → 刪除
- `OWNER`（由 `REPO` 推導的 repo owner）移除，作者帳號改由 `AUTHOR_HANDLE`（`~/.skill-readme-generate.json` 的 `github_owner`）提供；須填值。舊範本以 repo owner 當作者帳號，repo 放在組織底下時（go-image-server：`pardnio/go-image-server`）署名列與 `llms.txt` 把組織帳號標成作者帳號
- 專案端自行實作的範例機制（`<pkg>-demo` fence、`public/<pkg>-demo.js`，例：QuickUI、NanoMD、nanojson）改由範本 ` ```demo ` fence＋`DEMO_SCRIPT`＋`demo.js` 取代；改寫 code block、刪除舊 `public/<pkg>-demo.js`，舊值填入 `DEMO_SCRIPT`
- Organization `sameAs` 不再固定為 `https://github.com/{owner}`（owner 是個人帳號，不是組織），改由 `ORG_SAME_AS` 提供；須填值
- `llms.txt` 連結改指向各頁 Markdown 版，不再指向 HTML 頁
