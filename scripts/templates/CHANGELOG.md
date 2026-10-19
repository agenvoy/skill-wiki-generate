# Template Changelog

完整規範以 `SKILL.md` 與 `scripts/templates/` 為準（＝最新規範）；本檔只用於快速定位專案現有檔案與最新範本的差異，命中即直接修改專案。

最新改動：2026-10-20

## 破壞性變更

- NanoMD 版本改由 `nanomd/version.json` 記錄，`parser.css` 改內嵌 `nanomd/parser.css`（不再讀 node_modules）；複製 `sync-nanomd.js` 並執行 `node sync-nanomd.js`，`package.json` scripts 加 `sync-nanomd`，否則 build 以 `[Not found]` 中止
- 頁面內容改由 `@pardnchiu/nanomd` 在 build 時渲染（`Parse().html()`），進入頁面後載入同版本 `parser.js` 並執行 `MDParser.Init()`＋`Refresh()`，取代 `marked` 與 mermaid ESM 腳本；`wiki-worker/package.json` 相依改為 `@pardnchiu/nanomd` 後重跑 `npm install`；內容樣式改由 `parser.css` 提供，`docs.css` 移除 `.content h1`～`hr`／`table-scroll` 等內容規則（整檔覆蓋即取得）；`demo.js` 改讀 `code li` 逐行組回程式碼（整檔覆蓋即取得）
- 非首頁 title 移除作者名（`{label} - {SITE_NAME} Docs - {AUTHOR_NAME}` → `{label} - {SITE_NAME} Docs`，ZH 同理），`AUTHOR_NAME_ZH` 常數移除；專案 `build.js` 中的 `const AUTHOR_NAME_ZH = ...` 一併刪除。依據 seo-optimize knowledge_anchors A8：人名入 title 僅限首頁或作者頁，作者歸屬由署名列、`meta author` 與 JSON-LD `author` 表達
- 最後更新日期從署名列移到 h1 下方（`<p class="page-date">`）；署名列不再含日期。`docs.css` 新增 `.content .page-date`（整檔覆蓋即取得）；`pages/home*.md` 若含 README 的 `Last updated:`／`最後更新：` 行 → 刪除
- `OWNER`（由 `REPO` 推導的 repo owner）移除，作者帳號改由 `AUTHOR_HANDLE`（`~/.skill-readme-generate.json` 的 `github_owner`）提供；須填值。舊範本以 repo owner 當作者帳號，repo 放在組織底下時（go-image-server：`pardnio/go-image-server`）署名列與 `llms.txt` 把組織帳號標成作者帳號
- 專案端自行實作的範例機制（`<pkg>-demo` fence、`public/<pkg>-demo.js`，例：QuickUI、NanoMD、nanojson）改由範本 ` ```demo ` fence＋`DEMO_SCRIPT`＋`demo.js` 取代；改寫 code block、刪除舊 `public/<pkg>-demo.js`，舊值填入 `DEMO_SCRIPT`
- Organization `sameAs` 不再固定為 `https://github.com/{owner}`（owner 是個人帳號，不是組織），改由 `ORG_SAME_AS` 提供；須填值
- `llms.txt` 連結改指向各頁 Markdown 版，不再指向 HTML 頁
