# SEO Output Format

文件站生成（SKILL.md Step 8）的 SEO 產出只有兩份：**研究摘要**（Step 8.1，格式見 `research_protocol.md`）與**執行結果**（Step 8.4，編譯驗證後）。皆使用繁體中文，技術術語保留英文。

生成本身就是使用者授權的動作，因此沒有獨立的「規劃 → 確認」階段；需要使用者決定的項目（關鍵字、組織名、OG 圖、網域）已在 Step 0.3 詢問並寫入 config。

---

## 執行結果 `{yyyy-MM-dd_HH-mm}-applied.md`

```markdown
# {site_name} SEO / AEO 執行結果

> 研究依據：`research-{yyyy-MM-dd}.md`

## 目標設定

| 項目 | 值 |
|---|---|
| 主要關鍵字 | {primary_keywords} |
| 次要關鍵字 | {secondary_keywords} |
| 語言 | {locales}（各語言等權） |
| 目標引擎 | {engines} |
| 正式網域 | {domain} |
| 作者實體 | {person_name}（`{person_id}`） |
| 組織 | {org_name；無則寫「無」} |

## 已套用

| 規則 | 產出位置 | 內容 |
|---|---|---|
| R1 | `build.js` `HOME_TITLE` | `{title}` |
| R6 | `build.js` JSON-LD `@graph` | Person／Organization／WebSite／SoftwareSourceCode |

## 未套用

| 規則 | 原因 |
|---|---|
| R4 | 找不到可驗證的 OG 圖檔，`OG_IMAGE` 留空，需使用者提供 |

## 驗證結果

| 檢查 | 結果 |
|---|---|
| 每頁 h1 == 1 | {通過頁數} / {總頁數} |
| JSON-LD 可解析 | {通過頁數} / {總頁數} |
| llms.txt URL 對照頁面 | 差集：{空 / 列出} |

## 需人工後續

- [ ] {項目，例：R9 `gh repo edit --description "..."`（只列指令，不執行）}

## 驗證方式

{列出使用者可自行驗證的具體指令或 URL，例如：}

- Rich Results Test：`https://search.google.com/test/rich-results?url={domain}/`
- `curl -s {domain}/llms.txt | head`
- Search Console → 成效 → Generative AI 報告，追蹤 AI Overviews／AI Mode 曝光
```

---

## 撰寫規則

1. **每項都要有錨點**——實際檔案路徑與產出內容。指不到檔案的項目刪除
2. **每項都要有依據**——指向本次 research digest 或 knowledge_anchors 的條目編號
3. **禁止推測性語言**——「未來可能」「建議考慮」「或許可以」出現即重寫或刪除
4. **零項目是合法輸出**——某欄無項目時寫「無」，不硬湊
5. **不承諾成效**——可寫「研究顯示 X」並標註來源，不寫「可提升 N% 流量」
6. **量測方式要可執行**——寫得出指令或具體介面路徑，寫不出就不寫

## 落檔規則

- 目錄：`<project_root>/wiki-worker/.doc/seo/`，不存在時建立
- 檔案：`research-{yyyy-MM-dd}.md`、`{yyyy-MM-dd_HH-mm}-applied.md`
- 設定：`<project_root>/wiki-worker/.doc/seo/config.json`
- **永遠不在專案根目錄或 `wiki-worker/public/` 落檔**（`public/` 會被部署）
- 寫入後提醒使用者確認 `.doc/` 是否需加入 `.gitignore`
