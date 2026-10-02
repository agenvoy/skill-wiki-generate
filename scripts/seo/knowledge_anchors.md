# Knowledge Anchors

**上次驗證日期：2026-10-02**

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

**規格 v2（2026-10-02 補記）：** llmstxt.org 於 2026-08-10 發布 v2。檔案格式不變（H1 必要；blockquote 摘要、H2 連結清單 `- [name](url): notes`、`Optional` 段皆選用，`Optional` 僅剩慣例意義）。新增：HTML `<link>`／HTTP `Link:` 探索機制——`rel="describedby"` 指向適用的 llms.txt、`rel="alternate" type="text/markdown"` 指向該頁 Markdown 版；子路徑 llms.txt 涵蓋其下頁面且最具體者優先；Markdown 版命名可為 `page.html.md` 或 `page.md`；移除 `llms_txt2ctx` 展開工具，定位為「agent 讀索引後跟隨連結，連結應指向 LLM 友善內容」。以上皆為規格層機制，非搜尋排序訊號；wiki-generate 範本 1.2.0 起全數內建（R7.3：規格出新版即實作）。

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

**每次回答引用數的研究分歧（2026-10-02 補記）：** 上表引用數為概略值；2026 年各研究量測差異大——5W《State of AI Citations 2026》（2026-05，綜整 680M+ 則引用）稱 ChatGPT 每次回答 3–10 個來源；QuickSEO 2026 統計 ChatGPT 7.92／Claude 5.67／Perplexity 21.87。跨平台重疊約 11%、AI 引用 URL 與 Google 前十名重疊約 12% 兩項結論在多份研究間一致。**引用數只用於說明引擎差異，不作為優化目標。**

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

---

## A9 — ChatGPT 與 Copilot 的檢索層是 Bing 索引

**立場：** Bing 索引是 ChatGPT search 與 Microsoft Copilot 的檢索基礎（Tier 2：87%+ 的 ChatGPT search 引用與 Bing 前段結果重合）；頁面不在 Bing 索引等同於在這兩個引擎中不存在，與 Google 排名無關。Microsoft 於 2026-02 推出 Bing Webmaster Tools **AI Performance**（public preview），提供 Copilot 與 Bing AI 摘要的引用次數、被引用頁面、grounding queries。官方涵蓋範圍原文為「Microsoft Copilot, AI-generated summaries in Bing, and select partner integrations」，**未點名 ChatGPT**（2026-10-02 重抓確認）；第三方文章稱其涵蓋 ChatGPT 屬推論，不採信。

**Bing 官方建議（Tier 1）：** IndexNow 在內容新增、更新、刪除時主動通知參與的搜尋引擎，讓 AI 回答引用最新版本；另建議清楚的標題與表格結構、以證據支持主張、維持內容新鮮度。

**來源：** Bing Webmaster Blog *Introducing AI Performance in Bing Webmaster Tools Public Preview*（2026-02）。

**因此的判斷規則：** 目標引擎含 ChatGPT（固定預設包含）→ Bing Webmaster Tools 驗證與 sitemap 提交為必要檢查項；有建置／部署流程者建議接 IndexNow。

---

---

## A10 — 日期與新鮮度

**立場（Tier 1）：** Google 建議以 `datePublished` / `dateModified` 標註於 `CreativeWork` 子類型（`Article`、`BlogPosting`、`TechArticle`），並在頁面上可見地顯示「最後更新」日期；日期必須是實際發布或更新日，**禁止未來日期或與內容無關的日期**。

**Tier 2（樣本與方法差異大，每次重新確認）：** 多份 2026 研究指出 AI 引用偏好新內容——約半數被引用內容小於 13 週、Perplexity 對當年度內容偏好約 1.69 倍、Gemini 幾乎無偏好（0.78 倍）、ChatGPT 隨模型版本擺盪。

**因此的判斷規則：** 內容型頁面缺 `dateModified` → 依實際 git 修改時間或建置時間補上。**禁止**在內容未實質變動時改寫日期以製造新鮮度——這屬於操弄，且 Google 已將 spam policies 延伸到 AI 回答（A1）。

---

---

## A12 — AI 讀取／使用控制的標準與提案追蹤

**上次驗證：2026-10-02**（每次由 research_protocol A-5 逐列比對更新）

| 名稱 | 組織 | 機制 | 狀態 | 可實作 |
|---|---|---|---|---|
| llms.txt | Answer.AI（llmstxt.org） | `/llms.txt`、每頁 `.md`、`rel="describedby"`／`rel="alternate" type="text/markdown"` | v2，修改日 2026-08-10；無標準組織、IANA 未登錄 | 是（事實慣例，見 A3） |
| AI Usage Preferences vocab | IETF aipref WG | `train-ai`、`ai-use`、`search`，值 `y`／`n` | draft-ietf-aipref-vocab-08（2026-09-14），WG Document；IESG 里程碑 2026-08-31 已過未送 | 草案；需使用者決定政策 |
| AI Usage Preferences attach | IETF aipref WG | robots.txt `Content-Usage: [path] <prefs>`；HTTP header `Content-Usage` | draft-ietf-aipref-attach-05（2026-08-19），WG Document | 草案；需使用者決定政策 |
| Content Signals | Cloudflare | robots.txt `Content-signal: search=yes, ai-input=yes, ai-train=no`（詞彙與 aipref 不同） | 廠商自訂，文件 2026-08-03 | 是；需使用者決定政策 |
| TDMRep | W3C CG | `/.well-known/tdmrep.json`、header／meta `tdm-reservation`、`tdm-policy` | CG Final Report 2024-05-10；IANA provisional | 是；僅在需表達 EU DSM 第 4 條保留時 |
| Web Bot Auth | IETF webbotauth WG | bot 端 HTTP Message Signatures；bot 在自身網域發布 `/.well-known/http-message-signatures-directory` | draft-ietf-webbotauth-httpsig-protocol-00（2026-09-01） | 網站端無需動作 |
| A2A Agent Card | Linux Foundation | `/.well-known/agent-card.json` | IANA permanent，A2A 1.0.0 | 僅限提供 A2A agent 的站 |
| MCP Server Card | MCP Server Card WG | well-known 路徑未定（SEP-2127 PR Open） | experimental | 否 |
| WebMCP | W3C Web ML CG | 前端 `document.modelContext.registerTool()` | Draft CG Report 2026-09-30 | 否（需互動工具） |
| agents.txt、`/.well-known/ai` 等 agent discovery | 個人 I-D | 各自不同 | 皆未被 WG 採納 | 否 |

**廠商支援（官方頁）：** 截至驗證日，Google、OpenAI、Anthropic、Bing 的官方 crawler 頁皆未提及 `Content-Usage`、Content-Signal、TDMRep 或 llms.txt；Cloudflare 自家文件支援 Content Signals。

**判斷規則：** 「可實作」欄為「需使用者決定政策」者，技術上可直接加，但值（是否允許 AI 訓練、AI 輸入、搜尋）是內容授權決策，第一次必須詢問並寫入 config，之後依 config 套用；「否」者只追蹤不實作。
