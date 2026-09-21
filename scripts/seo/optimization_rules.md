# Optimization Rules

每條規則格式為：**判準（何時觸發）→ 動作（改什麼）→ 邊界（何時不做）**。

生成文件站（SKILL.md Step 8.2）時，只允許套用本檔列出的動作。分析結果未命中任何判準時，該面向的正確產出是「未觀察到需處理事項」，不是硬湊建議。

---

## 適用範圍路由

| 對象 | 生效規則組 | 處理方式 |
|---|---|---|
| `wiki-worker/public` 文件站 | R1–R6（頁面層）＋ R7（爬蟲指令）＋ R10（實體一致性） | 由 `build.js` 範本與 NAV／DESCRIPTIONS 產出，並於 Step 8.4 驗證 |
| 上層專案本身（library／cli） | R8（套件登錄頁）＋ R9（GitHub / README） | **只寫進 applied 報告的「需人工後續」**，不改檔、不執行遠端指令 |
| 兩者之間 | R10 | 專案描述、關鍵字、作者與組織寫法在文件站、README、套件登錄頁一致 |

---

## R1 — Title

**判準**：`title` 為空／長度 > 60 字元（CJK > 30 字）／同一 surface 內重複／未含主要關鍵字。

**動作**：改寫為 `{主要關鍵字}｜{區分詞}｜{品牌}` 或 `{主要關鍵字} - {品牌}`。

```html
<!-- before -->
<title>Documentation</title>
<!-- after -->
<title>Scheduler API Reference - go-scheduler</title>
```

**邊界**：
- 既有 title 已含關鍵字且長度合宜 → 不動。「換個寫法更順」不是理由
- 品牌名放尾端；首頁例外可放前
- 關鍵字只出現一次。`Scheduler - Go Scheduler - Cron Scheduler` 屬堆砌，禁止

---

## R2 — Meta description

**判準**：缺失／長度 > 160 字元（CJK > 80 字）／整站同一句／與 title 完全重複。

**動作**：寫一句描述該頁**實際內容**的句子，含主要關鍵字，說明使用者點進來會得到什麼。

**邊界**：
- description 不是排序因子，作用是點閱率與 AI 摘要素材。禁止塞關鍵字
- 已存在且準確描述該頁 → 不動
- 大量頁面缺 description 時，**不得**用樣板批次填同一句；改為由該頁 h1 + 首段生成各自的句子，做不到就只處理主要頁面並在報告說明未處理範圍

---

## R3 — Canonical / robots meta / lang

| 判準 | 動作 |
|---|---|
| 無 `<link rel="canonical">` | 加上該頁的絕對 URL（須確認正式網域，不得猜） |
| canonical 指向不存在或非本頁的 URL | 修正 |
| `<html>` 缺 `lang` | 依內容實際語言補上（`zh-Hant-TW` / `en`） |
| `robots` meta 為 `noindex` 但該頁應被索引 | 移除；**移除前必須向使用者確認**該頁確實應公開 |
| 無 `robots` meta | 不動——預設即為可索引，補 `index, follow` 是冗餘 |

**邊界**：正式網域無法從 `git_remote`、`robots.txt` 的 `Sitemap:` 指令、既有 canonical 或 `wrangler.toml` 推得時，**問使用者**，不得填 `https://example.com`。

---

## R4 — Open Graph / Twitter Card

**判準**：缺 `og:title` / `og:description` / `og:image` / `og:url` 任一。

**動作**：補齊四項；`og:type` 依頁面性質（`website` / `article`）；`twitter:card` 用 `summary_large_image` 並確認圖片實際存在於 repo 或可解析的 URL。

**邊界**：
- `og:image` 找不到實際圖檔 → 不得填造出來的路徑。改為在報告列為「需提供 OG 圖」的待辦
- OG 不影響搜尋排序，作用在社群分享與部分 AI 介面的預覽卡

---

## R5 — 標題階層與內容結構

**判準**：頁面 h1 數量 ≠ 1／h1 與 title 語意脫節／缺乏 h2 分段（`h2_count == 0` 且 `word_count > 600`）／主要內容與導覽在標記上無法區分。

**動作**：
- 每頁一個 h1，對應該頁主題
- 用語意化標籤標出主要內容（`<main>`、`<article>`）與導覽（`<nav>`）
- 長頁以 h2 分段，標題寫成使用者實際會問的形式（「如何設定 cron 排程」優於「設定」）

**邊界**：
- **禁止**為了 AI 而把每個 section 前面塞「直答塊」樣板，或把長頁拆成大量單一問答頁——見 knowledge_anchors A4，這是被官方點名的反模式
- 既有結構已清楚 → 不動

---

## R6 — 結構化資料（JSON-LD）

**判準**：頁面內容**確實符合**某個 schema.org 類型的語意，且該類型尚未標註；或既有 JSON-LD 解析失敗（`jsonld_invalid > 0`）。

**動作**：加入對應 JSON-LD。類型對照：

| 頁面性質 | 類型 |
|---|---|
| 軟體專案首頁 | `SoftwareApplication` 或 `SoftwareSourceCode` |
| 技術文件 / 教學 | `TechArticle`；有明確步驟者 `HowTo` |
| 部落格文章 | `Article` / `BlogPosting` |
| 站台整體 | `WebSite`＋`Organization`（放首頁） |
| 有實體營業地點 | `LocalBusiness` 子類型＋`address`＋`geo`＋`openingHours` |
| 頁面上**真實存在**的問答區塊 | `FAQPage` |

**邊界（重要）**：
- 標註內容必須與頁面上**可見內容一致**。頁面沒有 FAQ 區塊就標 `FAQPage`、沒有評分就標 `aggregateRating`，屬結構化資料垃圾，會被處分
- **不得**以「提升 AI 引用」為理由加 schema——官方已否定該因果（A2）。理由寫「rich results 資格」或「實體理解」
- 既有標註正確 → 不動

---

## R7 — 爬蟲指令

### R7.1 robots.txt

| 判準 | 動作 | 嚴重度 |
|---|---|---|
| `User-agent: *` + `Disallow: /`（站台應公開） | 移除全站封鎖 | Critical |
| 封鎖了檢索型 bot（`OAI-SearchBot`／`Claude-SearchBot`／`PerplexityBot`／`Googlebot` 等） | 向使用者確認是否有意；非有意則移除 | Critical |
| 無 robots.txt 且站台有多個 surface | 建立，含 `Sitemap:` 指令 | Medium |
| 有 robots.txt 但無 `Sitemap:` 指令且 sitemap 存在 | 補指令 | Low |
| 使用者明確表示要退出 AI 訓練 | 逐一列出訓練型 bot（見 A5 表），**不得**用 `*` | — |

### R7.2 sitemap.xml

**判準**：站台有 > 5 個頁面且無 sitemap；或 sitemap 存在但頁面數與 `page_count` 明顯不符。

**動作**：產生／更新 sitemap，含 `<lastmod>`。有建置流程者改為在建置階段產生，不手動維護一份會漂移的靜態檔。

**邊界**：sitemap 內的 URL 必須是實際可存取的正式網域路徑；推不出網域就先問。

### R7.3 llms.txt

**判準（唯一觸發條件）**：本專案是**供 AI agent 取用的開發者文件**（SDK / CLI / library 的 docs surface）。

**動作**：於文件站根目錄產生 llms.txt，列出主要文件頁的標題、URL 與一行說明。

**產生方式（依專案有無建置流程二選一，必須向使用者說明取捨）**：

| 專案型態 | 做法 | 代價 |
|---|---|---|
| 有建置流程（頁面清單由某個 NAV / manifest / frontmatter 驅動） | 在建置階段由該來源產生 | 需改建置腳本；文件增刪自動同步 |
| 無建置流程，或使用者明確表示不動程式 | 直接寫靜態檔 | 不碰程式；**文件增刪時會漂移**，須在報告標明此風險 |

**產出後必須驗證（強制）**：把 llms.txt 內的每個 URL 對照實際頁面清單比對，列出「llms.txt 有但頁面無」與「頁面有但 llms.txt 無」兩份差集。llms.txt 是給 agent 讀的入口索引，指向 404 比沒有這個檔更糟——agent 會把它當成權威清單。

**邊界**：
- 行銷官網、一般內容站 → **不產生**。Google 明文忽略（A3），產生它只是增加維護負擔
- 專案已有 llms.txt 但不屬上述例外 → 列為「可移除項」，交由使用者決定，不自行刪除
- 任何情況下**不得**宣稱 llms.txt 會提升搜尋或 AI 可見度
- **不得因為「它不影響排名」就在生成中略過本規則**：`analyze_seo.py` 的 `crawler_directives.llms_txt` 已回報其有無，判準成立時它就是一個待執行項，不是可選的加分題。（歷史事故：Agenvoy-page 一次執行中，llms.txt 因被歸類為「非文字改動」而在套用階段被整項跳過，使用者事後才發現漏掉。）

---

## R8 — 套件登錄頁 metadata（library / cli）

函式庫與 CLI 的「搜尋結果頁」是套件登錄站，不是自家網站。

| 生態 | 可優化欄位 | 判準 |
|---|---|---|
| npm | `description`、`keywords`、`homepage`、`repository` | `description` 為空或未含主要關鍵字；`keywords` 為空 |
| PyPI | `description`、`keywords`、`classifiers`、`project_urls` | 同上 |
| Packagist | `description`、`keywords`、`homepage` | 同上 |
| pkg.go.dev | 套件層 doc comment（`// Package xxx ...`）、README | package 註解缺失或未說明用途 |

**動作**：description 一句話寫清楚「這是什麼 + 解決什麼」；keywords 取 3–8 個使用者實際會搜的詞。

**邊界**：keywords 上限 8 個，塞滿無關詞在多數登錄站會降低相關性評分。Go 沒有 keywords 欄位——**不得**虛構。

---

## R9 — GitHub repo 與 README

**判準**：repo description 為空／無 topics／README 首段未在前兩句說明專案用途。

**動作**：
- repo description：一句話，含主要關鍵字（透過 `gh repo edit --description`，**須使用者授權**）
- topics：3–8 個（`gh repo edit --add-topic`）
- README 首段：前兩句內出現專案名 + 用途 + 主要關鍵字

**邊界**：
- README 已由 `/readme-generate` 管理時，**不直接改寫 README 結構**；只回報「順序 3 一句話描述建議調整為 X」，交由 readme-generate 重生成，避免兩個 skill 對同一檔案打架
- `gh` 指令會改動遠端狀態 → 一律先列出指令請使用者確認，不自行執行

---

## R10 — 實體一致性

**判準**：專案名／產品名／作者名在下列位置出現不一致寫法。

檢查位置：`package.json` name、`go.mod` module、README h1、網站 `<title>` 品牌段、`og:site_name`、JSON-LD 的 `name`、GitHub repo 名。

**動作**：統一為單一正式寫法，其餘位置對齊。

**為何**：實體一致是 Tier 2 研究中少數反覆被證實有效的做法（A8）；名稱漂移會讓引擎無法把散落的提及歸戶到同一實體。

**邊界**：大小寫與連字號差異（`go-scheduler` vs `Go Scheduler`）若分屬「套件識別碼」與「展示名稱」兩種用途，屬合理差異，不強制統一；真正要抓的是三種以上互不對應的寫法。

---

## 禁止動作（違反即刪除該建議，不保留）

| 反模式 | 為何禁止 |
|---|---|
| 關鍵字堆砌（title / description / 內文重複塞詞） | 直接觸發垃圾內容判定 |
| 為查詢變體大量產生近似頁面 | Google 明列為 scaled content abuse |
| 標註頁面上不存在的內容（假 FAQ、假評分、假作者） | 結構化資料垃圾，會被人工處分 |
| 隱藏文字、以 CSS 藏關鍵字、cloaking | 明確違規 |
| 為非 agent-facing 站台產生 llms.txt 並宣稱有 SEO 效果 | 與官方立場衝突（A3），製造無效維護負擔 |
| 承諾排名或流量成長幅度 | 無法驗證；研究數據只能標為研究結論 |
| 在 `code_type` 無 web surface 時虛構頁面優化 | 幻覺；該類專案的 surface 是 R8–R10 |
| 大量頁面套用同一份樣板 description / OG | 重複內容訊號，且對使用者無資訊價值 |
| 未經確認即改動 `noindex`、robots.txt 封鎖規則、遠端 repo metadata | 這些是有意的營運決策，誤改後果外顯 |

---

## 嚴重度定義

| 級別 | 判準 |
|---|---|
| **Critical** | 導致頁面無法被索引或無法被引用（全站 Disallow、誤設 noindex、封鎖檢索型 bot、canonical 指向錯誤頁） |
| **High** | 主要頁面缺 title / description / h1，或結構化資料解析失敗 |
| **Medium** | 缺 sitemap、缺 OG、標題階層混亂、套件登錄頁 metadata 空白 |
| **Low** | 長度超標、實體名稱寫法不一致、缺 `Sitemap:` 指令 |
