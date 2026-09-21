# Research Protocol

**每次完整生成文件站（無 `--only`）都必須完整跑一次本協定。**禁止沿用上一次的 digest、禁止僅憑模型內建知識作答。

**為何強制：** SEO / AEO 的有效做法半年內會反轉。2025 年多數指南主張「加 llms.txt 提升 AI 可見度」，2026-05-15 Google 官方指南明文表示 llms.txt 被忽略；同一份官方文件也推翻了「特定 schema 類型可觸發 AI 引用」的說法。依賴快取知識會直接產出反效果的優化動作。

---

## 時間窗

| 項目 | 規則 |
|---|---|
| 取得今日日期 | `date +%Y-%m-%d`（禁止假設當前日期） |
| 近半年起點 | `date -v-6m +%Y-%m` (macOS) / `date -d '6 months ago' +%Y-%m` (Linux) |
| 採信範圍 | 起點之後發布或更新的內容 |
| 例外 | Tier 1 官方文件即使發布較早，只要現行仍生效即採信（須確認頁面未被標記 deprecated） |

---

## Phase A：landscape research（SKILL.md Step 8.1，固定執行）

### A-1 必跑查詢集

全部並行送出。查詢字串中的 `{YYYY}` 以當前年份代入。

| # | 查詢 | 要回答的問題 |
|---|---|---|
| 1 | `Google Search Central {YYYY} AI Mode AI Overviews official guidance update` | 官方立場有無變動 |
| 2 | `AEO answer engine optimization best practices {YYYY}` | 業界當前主張 |
| 3 | `technical SEO checklist {YYYY} structured data AI crawlers` | 技術面清單變動 |
| 4 | `AI crawler user agents robots.txt {YYYY} GPTBot ClaudeBot PerplexityBot OAI-SearchBot` | crawler token 名單變動 |
| 5 | `how ChatGPT Perplexity Claude cite sources {YYYY} study citation data` | 各引擎檢索與引用機制 |
| 6 | `Core Web Vitals {YYYY} thresholds LCP INP CLS` | 效能門檻變動 |
| 7 | `schema.org structured data {YYYY} deprecated rich results changes` | schema 支援變動 |
| 8 | `llms.txt {YYYY} adoption support Google OpenAI Anthropic` | llms.txt 現況 |

### A-2 必抓一手來源

實際抓取頁面內容，**不得憑搜尋摘要代替**：

| URL | 抓取目的 |
|---|---|
| `https://developers.google.com/search/docs/fundamentals/ai-optimization-guide` | Google 對 AI 搜尋優化的現行立場（逐條列出建議） |
| `https://developers.google.com/search/updates` | 近半年文件變更清單 |

若上述 URL 404 或改版，記錄實際狀況並改抓 Google Search Central 首頁找對應新頁面。**不得因抓不到就跳過本步驟並沿用記憶。**

### A-3 來源分級（衝突時的裁決順序）

| Tier | 來源 | 採信度 |
|---|---|---|
| **1** | 搜尋引擎／模型廠商一手文件：`developers.google.com/search`、Google Search Central Blog、`web.dev`、OpenAI / Anthropic / Perplexity 的 crawler 與 bot 文件、`schema.org` | 最高，直接推翻其他層級 |
| **2** | 具方法論與樣本數的量化研究：SE Ranking / Ahrefs / Semrush / Whitespark 的 data study、學術論文（Princeton / IIT Delhi GEO 系列） | 高；須在 digest 標註樣本數與時間 |
| **3** | 從業者評論：Search Engine Land、Search Engine Journal、具名顧問部落格 | 中；僅作為 Tier 1/2 的補充解讀 |
| **4** | AEO / GEO SaaS 廠商的「{YYYY} Ultimate Guide」 | 預設不採信——販售 AEO 工具者對「AEO 是獨立學科」有利益衝突 |

### A-4 衝突處理（強制）

Tier 3/4 的主張與 Tier 1 衝突時：

1. **不得**寫入 digest 的「可執行做法」
2. **必須**寫入 digest 的「業界迷思」欄，附上被推翻的 Tier 1 出處與日期
3. 若該迷思已存在於專案（例：已有無用的 llms.txt），列為「可移除項」而非「已完成項」

---

## Phase B：targeted research（SKILL.md Step 8.1，取得 Step 0.3 關鍵字後執行）

Phase A 結束時尚未知道關鍵字與地區，故必須補跑第二輪。

| 條件 | 追加查詢 |
|---|---|
| 使用者提供關鍵字 | `{keyword}` 實際搜尋一次，記錄前 10 名的頁面型態（清單／教學／工具頁／論壇）與標題寫法 |
| 專案有多語版本 | **每個語言各搜一次該語言的關鍵字**，分別記錄前 10 名型態——同一概念在中英文的競爭態勢與頁面型態常完全不同，共用一份結論會誤判 |
| 有實體營業地點 | `Google Business Profile {YYYY} ranking factors NAP consistency` |
| 目標引擎含 ChatGPT / Perplexity / Claude | `{keyword}` 直接問一次各引擎的公開介面不可行時，改查 `{topic} most cited sources {YYYY}` |
| 專案為開發者工具／函式庫 | `llms.txt agent-facing documentation Anthropic OpenAI recommendation` — 判斷本專案是否落在 llms.txt 的**有效例外**（agent 取用的開發文件） |

---

## Digest 產出

寫入 `<project_root>/wiki-worker/.doc/seo/research-{yyyy-MM-dd}.md`，結構如下：

```markdown
# SEO / AEO 研究摘要（{yyyy-MM-dd}）

## 採信範圍
- 時間窗：{起點} ~ {今日}
- Tier 1 來源實抓：{URL 清單，含抓取結果摘要}

## 官方立場（Tier 1）
| 主題 | 現行立場 | 來源 | 日期 |
|---|---|---|---|

## 量化研究（Tier 2）
| 發現 | 樣本／方法 | 來源 | 日期 |
|---|---|---|---|

## 業界迷思（與 Tier 1 衝突，不採納）
| 主張 | 推翻它的 Tier 1 依據 | 對本專案的意涵 |
|---|---|---|

## 與上次執行的差異
{若 wiki-worker/.doc/seo/ 存在舊 digest，逐項比對並列出變動；無舊檔則寫「首次執行」}

## 本次可執行結論
{條列，每條必須對應到 optimization_rules.md 的某條規則；無對應者刪除}
```

**驗證：** digest 中每個「可執行結論」都必須能指到 Tier 1 或 Tier 2 出處。指不到的刪除，不得以「業界普遍認為」保留。
