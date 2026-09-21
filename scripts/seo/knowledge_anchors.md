# Knowledge Anchors

**上次驗證日期：2026-09-21**

本檔是「已驗證的一手立場」快照，**不是免跑研究的理由**。用途只有兩個：

1. 讓 Phase A 研究能**偵測變動**——新查到的說法與此處不同，代表立場有變（或此處已過期），必須以本次實抓的 Tier 1 來源為準
2. 讓模型**識破業界迷思**——多數 SEO 部落格的主張與下表衝突

**每次執行完 Phase A 後，若本檔任一條與實抓結果不符，就地更新本檔並改寫「上次驗證日期」。**

---

## A1 — AEO / GEO 不是獨立於 SEO 的學科

**立場：** Google 2026-05-15 發布的 *Optimizing your website for generative AI features on Google Search* 明確表示，讓內容出現在 AI Overviews / AI Mode 所需的，就是既有的 SEO 基本功：可被索引、可被抓取、具備 snippet 資格、內容有獨到價值。AI 功能與一般搜尋共用同一份索引與同一套 E-E-A-T 判準。

**來源：** `developers.google.com/search/docs/fundamentals/ai-optimization-guide`（2026-05-15 發布；2026-08-25 實抓時頁面標示 Last Updated 2026-07-10，立場未變）

**推翻了：** 「AEO 需要另一套與 SEO 平行的技術棧」。

---

## A2 — 沒有能觸發 AI 引用的特殊 schema

**立場：** 結構化資料**不是** generative AI 功能的必要條件，也不存在專供 AI 引用的 schema.org 類型。structured data 的價值仍在於 rich results 資格與幫助機器理解實體，不是引用觸發器。

**來源：** 同 A1。

**推翻了：** 「加上 FAQPage / Speakable 就能被 AI 引用」。

**仍然該做的：** 對**確實符合**該類型語意的頁面標註對應 schema（軟體專案 → `SoftwareApplication` / `SoftwareSourceCode`；教學頁 → `TechArticle` / `HowTo`；有實體店面 → `LocalBusiness`）。理由是實體理解與 rich results，不是 AI 引用。

**Discussion Forum / QA Page（2026-09-07 補記）：** Google 於 2026-03-24 為這兩種標記新增支援屬性，兩者仍在維護中。

**FAQ rich result 已停用（2026-08-16 補記）：** Google 於 2026-05-07 停止顯示 FAQ rich result，並於 2026-06-15 移除該功能文件（以 developers.google.com/search/updates 的變更清單為準）；Search Console API 支援於 2026-08 終止。**`FAQPage` 型別本身仍為合法 schema.org 型別**，既有標記留著不會受罰。因此「移除既有 FAQPage 標記」不是必要動作，但「為了 rich result 而新加 FAQPage」已無收益。

---

## A3 — llms.txt：Google 忽略，例外是 agent-facing 開發文件

**立場：**

| 主體 | 現況 |
|---|---|
| Google | 明文表示不需要、不讀取 llms.txt，既不加分也不扣分。**2026-06-15 已寫入官方文件變更日誌**（不再僅是 Gary Illyes / John Mueller 的公開發言），措辭為 neither harm nor help |
| OpenAI / Anthropic / Perplexity 的**搜尋與答覆管線** | 無任何一家公開承諾將其作為排序或引用訊號 |
| 採用率 vs 實際取用 | Ahrefs 2026-05 實測 137,000 網域：**97% 的 llms.txt 該月收到零次請求**；AI 檢索 bot 僅佔對這些檔案請求的 1.1%（GPTBot 4.51%、ClaudeBot 0.80%）。採用率高、取用率趨近於零 |
| **有效例外** | Anthropic 的 *Writing for Agents* 指南建議 agent 取用的開發文件提供 llms.txt；OpenAI 於 Agents SDK 與 Agentic Commerce Protocol 文件站自用 |

**來源：** 同 A1（Google 立場，2026-06-15 已入官方變更日誌）；Ahrefs 2026-05 取用率實測；Anthropic *Writing for Agents* 與 OpenAI Agents SDK 文件站實例。

**雙檔模式（2026-09-07 補記）：** 落在例外內的專案，2026 主流做法是 `llms.txt`（索引，供定位）＋ `llms-full.txt`（全文，供深度 ingestion），Anthropic、Vercel、LangGraph 皆採此模式。

**因此的判斷規則：** 專案是**供 AI agent 取用的開發者文件站**（SDK / CLI / library docs）→ 產生 llms.txt 有實際用途。行銷官網 / 一般內容站 → **不產生**；已存在者列為可移除項。

---

## A4 — 不需要為了 AI 而把內容切碎

**立場：** Google 表示其系統能理解涵蓋多主題的完整頁面並自行抽取相關段落，**不需要**站方預先「chunking」或拆成大量單一問題的頁面。為查詢變體大量產生近似頁面屬於 scaled content abuse。

**來源：** 同 A1。

**推翻了：** 「每個 section 都要放 40–60 字直答塊、把長文拆成 N 個問答頁」這類機械式指令。

**仍然該做的：** 清楚的段落／標題結構、語意化 HTML、主要內容與導覽可區分——這是可讀性與可抓取性要求，不是「為 AI 切塊」。

**成效追蹤（2026-08-25 補記）：** Search Console 已於 2026-06 提供 Generative AI performance report，AI 功能的曝光／點擊可直接在 GSC 觀測，不需第三方 AEO 追蹤工具。

**Preferred Sources（2026-09-07 補記）：** Google 已將 Preferred Sources 帶入 AI Overviews 與 AI Mode，使用者可自選偏好站台；2026-08-20 官方文件新增自訂互動按鈕的實作說明。這是「讓既有讀者把你設為偏好來源」的通道，不是排序技巧。

---

## A5 — 訓練型與檢索型 crawler 必須分開處理

**立場：** AI crawler 分兩類，封鎖後果完全不同。

| 類別 | User-agent | 封鎖後果 |
|---|---|---|
| 訓練型 | `GPTBot`、`ClaudeBot`、`Google-Extended`、`Applebot-Extended`、`Meta-ExternalAgent`、`Bytespider`、`CCBot`、`Amazonbot` | 不影響被引用；僅退出模型訓練 |
| 檢索型 | `OAI-SearchBot`、`ChatGPT-User`、`Claude-SearchBot`、`Claude-User`、`PerplexityBot`、`Perplexity-User`、`Googlebot`、`Bingbot`、`Applebot` | **封鎖等於放棄該引擎的引用資格** |

**因此的判斷規則：** `robots.txt` 中 `User-agent: *` + `Disallow: /` 會同時斷掉檢索型 crawler，屬 Critical。想退出訓練但保留引用，須逐一列出訓練型 bot 而非用萬用字元。

**注意：** `Bytespider` 與 Perplexity 的部分抓取行為有被記錄為不遵守 robots.txt。robots.txt 是宣告而非強制手段。

---

## A6 — 各引擎的檢索來源與引用行為差異極大

**立場（Tier 2，數據來源需每次重新確認）：**

| 引擎 | 檢索基礎 | 每次回答引用數（概略） | 明顯偏好 |
|---|---|---|---|
| ChatGPT | Bing 索引 | ~4 | Wikipedia、廣泛網路權威、編輯型媒體 |
| Perplexity | 自有抓取，每次查訪約 10 頁引用 3–4 | ~12 | Reddit 等社群、時效性 |
| Claude | Brave Search | ~2–3 | 技術精確、來源完備的內容 |
| Google AI Overviews / AI Mode | Google 索引 | 不定 | 與一般搜尋同一套判準 |

Yext 分析 680 萬則引用顯示，同一查詢下**僅約 11% 的被引用網域會跨平台重複出現**（Averi 於 2026-03 以 6.8 億則引用重測，同樣得到約 11%）。

**OAI-SearchBot 不執行 JavaScript（2026-08-16 補記）：** Writesonic 於 2026-03 的實驗確認 ChatGPT 的檢索端為 HTML-only parser。**因此的判斷規則：** 主要內容僅在 client-side JS 執行後才出現的站台（CSR SPA），對 ChatGPT 等同不存在；SSR / SSG / 靜態 HTML 站台不受此限。此項優先於任何內容層優化——內容抓不到時，其餘皆無意義。

**因此的判斷規則：** 「一套做法通吃所有 AI 引擎」不成立。目標引擎由 config 的 `engines` 決定（SKILL.md Step 0.3 固定為全部引擎），並據此調整重點；未指定時預設以 Google 一般搜尋為主軸，因為它同時是 AI Overviews 的基礎。

---

## A7 — Core Web Vitals 門檻

| 指標 | Good | Poor | 量測 |
|---|---|---|---|
| LCP | ≤ 2.5s | > 4.0s | CrUX 真實使用者第 75 百分位、28 天滾動 |
| INP | ≤ 200ms | > 500ms | 同上；2024-03 起取代 FID |
| CLS | ≤ 0.1 | > 0.25 | 同上 |

INP 是最常未達標的一項——2026 年統計約 **43% 的站台未達 200ms**。

---

## A8 — 真正有槓桿的內容投資（Tier 2）

Princeton / Georgia Tech / IIT Delhi 的 GEO 研究指出，實體密集（entity-rich）、事實密集的內容在生成式回答中的可見度提升幅度顯著（研究報告區間 30–115%）。實務上對應到：

- **獨有數據**：benchmark、實測數字、案例——別人沒有的數字最容易被引用
- **實體一致性**：專案名、作者名、產品名在官網、GitHub、套件登錄頁、社群檔案間完全一致
- **第三方提及**：AI 引擎偏好站外佐證高於自家站內宣稱

**注意：** 該研究的可見度提升是相對於未優化基準的實驗結果，不是對任意站點的保證值。引用時須標註為研究結論而非承諾。
