# Template Changelog

完整規範以 `SKILL.md` 與 `scripts/templates/` 為準（＝最新規範）；本檔只用於快速定位專案現有檔案與最新範本的差異，命中即直接修改專案。

最新改動：2026-10-05

## 破壞性變更

- `OWNER`（由 `REPO` 推導的 repo owner）移除，作者帳號改由 `AUTHOR_HANDLE`（`~/.skill-readme-generate.json` 的 `github_owner`）提供；須填值。舊範本以 repo owner 當作者帳號，repo 放在組織底下時（go-image-server：`pardnio/go-image-server`）署名列與 `llms.txt` 把組織帳號標成作者帳號
- 專案端自行實作的範例機制（`<pkg>-demo` fence、`public/<pkg>-demo.js`，例：QuickUI、NanoMD、nanojson）改由範本 ` ```demo ` fence＋`DEMO_SCRIPT`＋`demo.js` 取代；改寫 code block、刪除舊 `public/<pkg>-demo.js`，舊值填入 `DEMO_SCRIPT`
- Organization `sameAs` 不再固定為 `https://github.com/{owner}`（owner 是個人帳號，不是組織），改由 `ORG_SAME_AS` 提供；須填值
- `llms.txt` 連結改指向各頁 Markdown 版，不再指向 HTML 頁
