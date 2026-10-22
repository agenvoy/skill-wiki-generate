---
name: wiki-generate
description: 從原始碼分析自動生成雙語文件站台（wiki-worker/public/docs），專注把專案每個細節寫進文件；所有 SEO／AEO／GEO 輸出（meta、JSON-LD、sitemap、robots、llms.txt）一律交給 /seo-optimize。當使用者請求為專案建立多頁文件、需要在 wiki-worker/public/docs/pages/ 下生成英文（slug.md）與繁體中文（slug.zh.md）成對檔並編譯成靜態 HTML 文件站、或希望為函式庫／CLI 工具建立可部署的雙語文件網站時使用。
---

# 文件站產生器

從原始碼、CLAUDE.md、`doc/` 既有文件與專案結構分析，產生雙語靜態文件站（`wiki-worker/public/docs/`），並提供 `wiki-worker/build.js` 將 markdown 編譯為可直接部署的 HTML。

**職責分工：** 本 skill 只負責讀專案、把每個細節寫成文件內容（`pages/*.md`、`NAV`）與站台設定；不研究 SEO、不填任何 SEO 值。title、description、keywords、JSON-LD、OG、hreflang、favicon、AI 使用偏好、sitemap、robots、llms.txt 的值全部由 `/seo-optimize` 依最新研究寫入 `wiki-worker/seo.json`，`build.js` 讀它輸出。**每次完整生成都必須接著跑 `/seo-optimize`**（Step 8）；沒有 `seo.json` 時 build 只產出內容頁，不可部署。

## 指令語法

```
/wiki-generate [REPO_PATH] [--only <pages>] [--pages <list>]
```

### 參數（全部選填）

| 參數             | 格式                        | 範例                                        | 行為                         |
| ---------------- | --------------------------- | ------------------------------------------- | ---------------------------- |
| `REPO_PATH`      | `github.com/{owner}/{repo}` | `github.com/foo/bar`                        | 覆蓋預設 owner / repo        |
| `--only <pages>` | 逗號分隔                    | `--only home,configuration`                 | 僅重生指定頁；其他頁不讀不寫 |
| `--pages <list>` | 逗號分隔                    | `--pages getting-started,api-reference,faq` | 覆蓋自動推導的頁面清單       |

**參數識別規則：** 順序獨立，依路徑模式 / `--flag` 解析。

### `--only` vs `--pages`

| 場景                          | 使用                           |
| ----------------------------- | ------------------------------ |
| 已生成文件站，只想刷新 1–2 頁 | `--only`                       |
| 第一次生成、想自定頁面集合    | `--pages`                      |
| 預設                          | 不傳；分析專案後自動推導頁面集 |

`--only` 模式下：

- 未指定的頁面 **不得讀取、不得覆寫**
- Home 若不在 `--only` 內也不動（即使有新頁面被加入也不更新 Home 導覽）
- `REPO_PATH` 仍套用至重生的頁面
- `--only` 後仍須重跑 `node wiki-worker/build.js`（NAV 未變動時新頁 HTML 不受影響，但確保輸出一致）

---

## Step 0：作者設定（共用 readme-generate config）

**文件站生成需要的作者資訊（name / email / url / github_owner）與 readme-generate 相同，刻意共用一份 config 避免重複設定。腳本本身已隨 skill 複製一份至本地，不依賴 readme-generate 是否安裝。**

### 設定檔

```
~/.skill-readme-generate.json
```

（檔名沿用 readme-generate 命名以保持兩 skill 共用同一份 config，避免使用者在兩處重複輸入相同資料。）

### 執行協議

下文指令中的 `{skill_dir}` 為本 `SKILL.md` 所在目錄的絕對路徑，依當前執行環境實際載入位置代入。

**Step 0.1：檢查設定**

```bash
python3 {skill_dir}/scripts/setup_config.py check
```

| Exit Code | stdout    | 動作              |
| --------- | --------- | ----------------- |
| `0`       | 單行 JSON | 解析後跳到 Step 1 |
| `1`       | （無）    | 進入 Step 0.2     |

**Step 0.2：收集輸入（缺檔時）**

向使用者依序詢問四欄位：`author_name` / `author_email` / `author_url` / `github_owner`，再呼叫：

```bash
python3 {skill_dir}/scripts/setup_config.py write \
    "{author_name}" "{author_email}" "{author_url}" "{github_owner}"
```

**Step 0.3：站台設定（新專案第一次生成時額外詢問）**

先檢查 `<project_root>/wiki-worker/.doc/seo/config.json`：存在且欄位完整 → 載入並向使用者複述一行；缺失 → 向使用者詢問下表缺少的欄位後寫入該檔。

| 欄位        | 用途                                                                                                                                                                       | 預設 fallback                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `site_name` | 文件站顯示名稱（header 以外的品牌段、署名列）。**套件／函式庫／CLI 一律用 `{owner}/{repo}`**（如 `pardnchiu/go-bot`）；只有具獨立品牌名的產品（Agenvoy、ToriiDB、KuraDB）才用品牌名本身 | `{owner}/{repo}`                                                                   |
| `domain`    | 正式部署網域（`https://example.com`，不含結尾斜線）                                                                                                                        | 從 `wrangler.toml` routes、GitHub repo homepage 推得；推不出就問，**不得填佔位網域** |
| `gtag_id`   | Google Analytics 量測 ID，留空則不注入                                                                                                                                     | 空字串                                                                             |

實體（Person、Organization、`sameAs`）、tagline、OG 圖、favicon、品牌詞、`x-default`、AI 使用偏好、title、description、keywords 都是 SEO 值，由 `/seo-optimize` 決定並寫入 `wiki-worker/seo.json`；本 skill 不詢問、不寫入。

**Step 0.4：覆蓋優先序**

| 來源                            | 優先                 |
| ------------------------------- | -------------------- |
| `REPO_PATH` 指令參數            | 最高（owner / repo） |
| `~/.skill-readme-generate.json` | 次高（其他作者欄位） |
| `git remote get-url origin`     | 第三                 |
| 資料夾名稱                      | fallback             |

---

## Step 1：分析專案

### Step 1.1：執行 analyzer 取得符號清單（粗掃）

```bash
python3 {skill_dir}/scripts/analyze_project.py /path/to/project
```

**輸出**：language / files / functions / types / dependencies 的 JSON 摘要。

**用途**：作為「該讀哪些檔」的索引，**不**作為文件內容生成的依據。analyzer 用 regex 抽符號，會遺漏：

- 函式 body 內的實際邏輯／流程／錯誤分支
- 巢狀 type 與 closure 中的隱含介面
- 跨檔依賴的真實呼叫關係
- 註解中的設計決策、TODO、限制
- mermaid／表格／範例所需的完整 context

### Step 1.2：讀取完整檔案（強制）

**文件生成不可只靠 analyzer 摘要**。針對每個將生成的頁面，**必須完整讀取**對應的原始碼檔案與既有文件。

| 頁面類型                            | 必讀檔案                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **任何頁**                          | `CLAUDE.md`（根，整份）                                                                                |
| **Architecture**                    | `doc/architecture.md`（整份）+ `analyze_project.py` 列出的核心模組所有 `.go` / `.py` / `.ts` 檔        |
| **Core-Concepts**                   | 主要 entry point（`main.go` / `cmd/*/main.*` / `index.ts`）+ 核心 dispatch / loop 檔（整檔，不抓片段） |
| **Configuration**                   | `.env.example` 整份 + 所有 `os.Getenv` / `process.env` 呼叫所在檔（用 grep 定位後整檔讀）              |
| **CLI-Reference**                   | `main.*` + flag / cobra / argparse 註冊處所在檔（整檔）+ `makefile`                                    |
| **API-Reference**                   | 所有 exported types / functions 所在的檔案（整檔，不只看 signature）                                   |
| **Skill-System / Tools / 子系統頁** | 對應 `extensions/skills/*/SKILL.md` 整份 + 對應實作檔                                                  |
| **Getting-Started**                 | `README.md` + `Makefile` + `Dockerfile`（如有）+ entry point                                           |

**為何：**

1. **文件是 source of truth**：讀者打開文件是要學整個系統運作，分支邏輯／邊界條件不能漏。analyzer 只看符號名，講不清楚「這個函式的 retry 策略是什麼」、「這個 dispatch 有幾種 path」
2. **避免幻覺**：未讀的檔案不能寫進文件。寫入前 grep 一次確認 symbol 存在、簽名正確
3. **Mermaid 結構真實性**：架構圖的 box / arrow 必須對應實際 import / call graph，僅靠 type 名稱會編造關係

**操作建議：**

- 讀取檔案時不截斷範圍；單次讀取有行數上限時才分段讀取至完整檔案
- 多檔讀取**並行呼叫**，不要序列化
- 讀過的檔案在生成時可引用 `path:line` 讓讀者跳轉
- 若檔案過大（> 2000 行）→ 拆段讀完整檔，禁止只讀前 N 行就下結論
- 寫入或修改前，先讀取目標內容比對；內容已相同時跳過寫入

### Step 1.3：頁面結構額外來源

| 路徑                                           | 用途                                                |
| ---------------------------------------------- | --------------------------------------------------- |
| `README.md`（根）                              | **Home 頁（`pages/home.md`）內容來源，逐字鏡像**    |
| `README.zh.md`（根）／`doc/README.zh.md`       | Home 頁 ZH 版（`pages/home.zh.md`）內容來源         |
| `CLAUDE.md`（根）                              | 真理來源；架構 / 規範 / 禁止事項                    |
| `doc/architecture.md`                          | 模組關係；可拆成多頁                                |
| `doc/doc.md`                                   | 既有技術文件；對應 Configuration / CLI Reference 頁 |
| `extensions/skills/*/SKILL.md`                 | Skill 系統頁面所需                                  |
| `makefile` / `package.json` / `pyproject.toml` | CLI 指令清單                                        |
| `.env.example`                                 | 環境變數清單                                        |

### Step 1.4：API 覆蓋率與移除紀錄（強制，每次生成）

目標：程式碼現有的每個公開符號都寫在文件裡，文件裡的每個符號都還存在於程式碼；已移除的符號保留在文件中並標出移除版本。

```bash
git -C <project_root> fetch --tags --force
python3 {skill_dir}/scripts/check_coverage.py <project_root> --write-symbols <project_root>/wiki-worker/public/docs/symbols.json
```

`--write-symbols` 同時輸出公開符號清單（不含 method），`build.js` 據此在 `llms.txt` 產生 `## Symbols` 索引；`symbols.json` 是生成產物，不手改。

| 輸出欄位                            | 意義                                                                                        | 動作                                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `missing`                           | 程式碼有、文件沒寫的公開符號（Go 以 `go doc -all` 取得，含 const／var／func／type／method） | 先完整讀實作，再寫進對應主題頁；沒有合適的頁就依 Step 2「頁面主軸」新開頁。補的是**功能說明**（行為、各供應商差異、邊界），不只是把符號名列進表格                          |
| `removed`                           | 文件提到、程式碼已不存在的識別字，附 `removed_in`（含移除 commit 的第一個 tag）             | 不刪除：從原頁移到「已移除 API」頁，標 `Removed in vX.Y.Z`／`移除於 vX.Y.Z`；`note: never existed in git history` 代表文件寫錯（縮寫、佔位名），改成實際完整符號名         |
| `undocumented_removals`             | 沿 tag 逐版比對找出的歷史移除符號，文件中尚無移除紀錄                                       | 寫進「已移除 API」頁：符號、套件、`Removed in`、最後存在版本、替代做法。替代做法從 `public/docs/tags/<removed_in>.md` 或移除 commit 的 diff 取得，查不到就寫「無公開替代」 |
| `removed_in: unreleased (after vX)` | 移除尚未發版                                                                                | 寫 `Removed after vX (unreleased)`；下次生成時腳本會回報實際版號，屆時改正                                                                                                 |

腳本 exit 0 才算完成。英中兩版同步，移除標記兩邊都要寫（`Removed in`／`移除於` 是腳本辨識移除紀錄的關鍵字，不得改寫）。

**為何：** 文件是讀者學會整個 API 的唯一入口。新功能沒寫＝讀者不知道它存在；移除的功能直接刪掉＝升級中的讀者找不到「這個符號去哪了、從哪一版開始」。只靠人工比對會漏：go-llm-router 2026-10-02 的 `WithSessionID`／`SessionUUID`、`core/xai`，以及 v0.3.0 移除的 11 個 reasoning 函式，全部是腳本找出來的。

`--only` 模式：仍執行並回報；只修改 `--only` 指定的頁面，其餘缺漏列在回應中。

---

## Step 2：推導頁面集合

### 預設頁面集（自動推導）

| 頁                  | slug              | 觸發條件                                                 | 內容                                                                  |
| ------------------- | ----------------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| **Home**            | `home`            | 永遠                                                     | 概覽、Highlights、快速連結                                            |
| **Getting Started** | `getting-started` | 永遠                                                     | 前置需求、安裝、第一次執行                                            |
| **Architecture**    | `architecture`    | 專案有 `doc/architecture.md` 或 CLAUDE.md 含模組關係描述 | 概覽 Mermaid + 分層表 + 跨切原則；連結至 `doc/architecture.md` 完整版 |
| **Core Concepts**   | `core-concepts`   | 任何非 trivial 專案                                      | 核心抽象、執行模型、邊界                                              |
| **Configuration**   | `configuration`   | `.env.example` 存在或 `os.Getenv` 多處                   | 設定檔結構、env 變數                                                  |
| **CLI Reference**   | `cli-reference`   | `main.go` + flag 派發、`makefile` 含可執行 target        | 主指令、子指令                                                        |
| **API Reference**   | `api-reference`   | 函式庫專案（無 main、有 exported types）                 | exported API                                                          |

**Architecture 與 doc/architecture.md 的分工：**

| 文件                  | 範圍                                                | 圖數  |
| --------------------- | --------------------------------------------------- | ----- |
| Architecture 頁       | **單張**系統概覽 + 分層表 + 跨切原則 + 延伸閱讀連結 | **1** |
| `doc/architecture.md` | 模組級全展開（per-module 圖、sequence、狀態機）     | 8–10+ |

**Architecture 頁嚴格只放一張概覽 Mermaid。** 流程細節（dispatch、sequence、狀態機）一律不重複，原因：

1. **流程圖該分開放** —— dispatch 屬 Core Concepts、sequence／state machine 屬 doc/architecture.md，Architecture 頁只負責「整體層級關係」
2. **避免讀者重複看同樣的圖** —— 同一張 sequence 圖出現在 Architecture 與 doc/architecture.md 是 noise，不是 redundancy
3. **文件站不是 doc 的 mirror** —— 每頁應 self-contained 但聚焦單一觀察角度

**禁止**整段搬 `doc/architecture.md`，也**禁止**在 Architecture 頁塞超過一張 Mermaid。要再加圖→放對應 topic 頁（dispatch → Core Concepts、sequence → doc/architecture.md）。

### 專案特定頁面（從 CLAUDE.md 一級標題推導）

掃描 CLAUDE.md 的 `##` 一級標題；任何顯著的「子系統」或「模組」段落（≥ 50 行）即可成為獨立頁。例：

| CLAUDE.md 段落      | 推導 slug              | Label                |
| ------------------- | ---------------------- | -------------------- |
| `## MCP client`     | `mcp-integration`      | MCP Integration      |
| `## Sandbox`        | `security-and-sandbox` | Security and Sandbox |
| `## Memory layer`   | `memory-system`        | Memory System        |
| `## Tool Subsystem` | `tools`                | Tools                |
| `## Skill 系統`     | `skill-system`         | Skill System         |

### slug 命名規則

- **slug = lowercase-kebab-case**，與 URL path（`/{slug}`）、檔名前綴完全一致
  - `Getting Started` → slug `getting-started` → 檔名 `getting-started.md`
  - `Memory System` → slug `memory-system` → 檔名 `memory-system.md`
  - `Security and Sandbox` → slug `security-and-sandbox` → 檔名 `security-and-sandbox.md`
- `home` 為保留 slug，永遠對應站台首頁（編譯後輸出為 `index.html`）
- ZH 版加 `.zh` 中綴：`getting-started.zh.md`
- **禁止**大寫字母、底線、空白混入 slug（`Getting_Started` / `gettingStarted` 皆不合法）

### 預設頁數

頁數由主題數決定，不設上限——每頁一個主軸（見下節），靠 NAV 分組維持可掃讀性。少於 6 頁表示專案太小（README 即足夠）。

### 頁面主軸：一頁一個小主題（強制）

目標：讀者從側欄標題點進去，十秒內能確認答案在不在這頁。一頁只回答一類問題，不同問題拆成不同頁，由側欄分組串起來。**分類可以細、可以多（NAV section 與頁數不設上限）；單頁內容不行。**

| 判準（任一命中 → 拆頁）                                              | 例                                                                               |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 開場一句話要用「與／以及」串起 3 個以上主題才講得完                  | `providers`：供應商清單、特定供應商細節、模型路由、reasoning、自訂端點、失敗處理 |
| 兩個 `##` 段落回答不同類提問（「有哪些」／「怎麼選」／「怎麼設定」） | 「支援哪些供應商」與「dispatcher 怎麼挑模型」                                    |
| 英文原始檔超過約 6 KB，或 `##` 超過 4 個                             | 長度本身就是拆頁理由，不需另找其他判準                                           |
| 某個 `##` 段落已有自己的子標題與表格，自成一題                       | 一個獨立的路由子系統                                                             |

拆頁做法：

- **非首次生成時，拆頁前先以 `AskUserQuestion` 詢問**：列出原頁、擬拆出的子頁（slug＋標題），以及原網址要 301 到哪一頁（預設承接第一個子主題的那頁）；使用者同意才拆，否決就維持原頁
- 子頁 slug 以主題 slug 為前綴（`providers-routing`），NAV 中相鄰排列；需要時直接為它開新 section，不必擠進既有分組
- 拆完原 slug 不再保留：`wiki-worker/redirects.json` 加 `"/<原 slug>": "/<承接頁>"` 與 `"/zh/<原 slug>": "/zh/<承接頁>"`（worker.js 以 301 導向），並把指向已搬走段落的 `/<slug>#anchor` 站內連結改到新頁
- 每個新頁同步填 `NAV`、`NAV_ZH_LABEL`；該頁的 description／keywords 由 Step 8 的 `/seo-optimize` 寫入 `seo.json`
- 英中同步拆，兩邊頁面與段落一一對應

**為何：** 一篇塞滿所有子題，讀者得捲完整頁或靠 Ctrl-F 才找得到答案；拆成小頁後側欄本身就是目錄。`llms.txt` 的讀者同理——小頁讓單次抓取就命中所需內容。

### 已上線頁面的移除與改名（強制詢問）

`public/docs/dates.json` 有紀錄的頁面都已上線。移除或改 slug 前一律以 `AskUserQuestion` 詢問，列出網址與原因（功能已移除、併入其他頁等），使用者同意才動：

| 決定 | 動作 |
| --- | --- |
| 改名／併入其他頁 | `redirects.json` 加舊網址 → 新網址（EN、ZH 各一條），worker.js 回 301 |
| 移除 | 刪 `pages/<slug>.md`（及 `.zh.md`）與 NAV 項目，`wiki-worker/removed.json` 加 `"/<slug>"`、`"/zh/<slug>"`；worker.js 對該網址回 404 頁（狀態碼 404） |
| 否決 | 保留頁面；內容過時就更新內容，不刪頁 |

`build.js` 會比對 `dates.json`：已上線的網址不在現有頁面、`redirects.json`、`removed.json` 任一處時以 `[Conflict]` 中止並列出網址。不得為了讓 build 通過而自行加 `redirects.json`／`removed.json` 條目。

**為何：** 重生文件時頁面集合由分析重新推導，推導結果少了一頁就會靜默消失，外部連結與搜尋結果全部斷掉；使用者 2026-10-23 要求拆分與 404 都要先詢問，並減少已有頁面被莫名移除。

### NAV 分組

每個頁面需歸入一個 `section`（導覽側欄分組），依頁面性質分組，常見分組：`Overview`（Home / Getting Started）、`Concepts`（Core Concepts / Architecture）、`Reference`（CLI / API Reference / Configuration）、以及專案特定子系統分組（如 `Tools`、`Security`）。分組數量與內容依專案調整，不強制固定清單。

---

## Step 3：寫入位置

```
<project_root>/wiki-worker/
├── build.js                              (md → html 編譯腳本；首次生成時從 skill 範本複製並客製化)
├── sync-tags.js                          (GitHub Releases → docs/tags/*.md；首次生成時從 skill 範本複製並客製化)
├── sync-nanomd.js                        (記錄 NanoMD 版本並下載該版 parser.css；從 skill 範本複製，不客製)
├── nanomd/
│   ├── version.json                      (sync-nanomd.js 產出：本站使用的 NanoMD 版本，勿手動編輯)
│   └── parser.css                        (sync-nanomd.js 產出：該版 parser.css，build.js 內嵌進每頁)
├── indexnow.js                           (部署後送出內容有變的 URL 至 IndexNow；從 skill 範本複製，不客製)
├── .indexnow-sent.json                   (indexnow.js 產出：每個 URL 已送出的 lastmod)
├── package.json                          (`{repo}-wiki`；首次生成時從 skill 範本複製)
├── wrangler.toml                         (`{repo}-wiki`；Cloudflare Workers 部署設定；首次生成時從 skill 範本複製)
├── seo.json                              (/seo-optimize 產出：所有 SEO 值；本 skill 不寫入，缺少時 build 不輸出任何 SEO 產物)
├── redirects.json                        (舊網址 → 現行網址，worker.js 回 301；只在使用者同意拆頁／改名後新增條目)
├── removed.json                          (經使用者同意移除的網址，worker.js 回 404 頁)
└── public/
    ├── docs.css                          (文件站樣式；**每次生成都從 skill 範本整檔覆蓋**，不手動維護)
    ├── demo.js                           (前端套件的即時範例執行器；`DEMO_SCRIPT` 有值時**每次生成都從 skill 範本整檔覆蓋**，見 Step 5.1)
    ├── sitemap.xml                       (build.js 依 seo.json 產出，勿手動編輯)
    ├── robots.txt                        (build.js 依 seo.json 產出，勿手動編輯)
    ├── _headers                          (build.js 依 seo.json 產出：`.md`／`*.txt` 的 `charset=utf-8`，勿手動編輯)
    ├── llms.txt                          (build.js 依 seo.json 產出：頁面索引＋`## Symbols` 符號索引)
    ├── llms-full.txt                     (build.js 依 seo.json 產出：EN 全文；ZH 版在 zh/llms-full.txt)
    ├── 404.html                          (build.js 產出：404 頁，含專案介紹與文件導覽，noindex；ZH 版在 zh/404.html)
    ├── {indexnow-key}.txt                (indexnow.js --ensure-key 產出的 IndexNow key 檔)
    ├── assets/                           (README 引用的本地圖片原樣複製於此，如 logo.svg、logo.png)
    ├── docs/
    │   ├── symbols.json                  (check_coverage.py --write-symbols 產出，勿手動編輯)
    │   ├── dates.json                    (build.js 產出：每頁內容雜湊與 published／modified 日期；必須保留，刪除會讓所有日期重置)
    │   ├── pages/                        (markdown 原始檔，唯一手動編輯的來源)
    │   │   ├── home.md                   (EN)
    │   │   ├── getting-started.md        (EN)
    │   │   ├── getting-started.zh.md     (ZH)
    │   │   └── ...
    │   └── tags/                         (sync-tags.js 產出，勿手動編輯)
    │       ├── v0.28.20.md               (GitHub release body 原文)
    │       ├── ...
    │       └── manifest.json             (tag → 發布日期)
    ├── index.html                        (build.js 編譯產出 — EN 文件首頁，對應 pages/home.md)
    ├── getting-started.html              (build.js 編譯產出 — EN)
    ├── ...
    ├── released/                         (build.js 編譯產出 — 版本紀錄，EN only)
    │   ├── index.html                    (版本索引，路徑 /released/)
    │   └── v0.28.20.html                 (路徑 /released/v0.28.20)
    └── zh/
        ├── index.html                    (build.js 編譯產出 — ZH 文件首頁，對應 pages/home.zh.md)
        ├── getting-started.html          (build.js 編譯產出 — ZH)
        └── ...
```

**規則：**

- **唯一手動編輯來源是 `wiki-worker/public/docs/pages/*.md`**；`wiki-worker/public/docs/` 底下的另一個子目錄 `tags/` 全由 `sync-tags.js` 產出，不手寫、不改字
- `wiki-worker/public/*.html` 與 `wiki-worker/public/zh/*.html` 一律由 `node wiki-worker/build.js` 產生，**不得手動編輯 HTML**
- `wiki-worker/public/index.html`（EN）與 `wiki-worker/public/zh/index.html`（ZH）即為文件首頁（也是站台首頁），分別對應 `pages/home.md` 與 `pages/home.zh.md`；不額外設 `/docs` 路徑前綴
- 未提供 `.zh.md` 的頁面，build.js 只輸出 EN，不產生對應 ZH HTML（不得留空殼 ZH 檔）
- 版本紀錄（`/released/`）**只有 EN**：內容是 GitHub release body 原文，不翻譯、不加語言切換 fab、不發 hreflang alternate

### Step 3.1：首次生成 — 複製並客製化 build.js / docs.css / package.json / wrangler.toml

若 `wiki-worker/build.js` 不存在：

1. 複製範本：
   ```bash
   mkdir -p <project_root>/wiki-worker/public/docs/pages <project_root>/wiki-worker/public/zh
   cp {skill_dir}/scripts/templates/build.js <project_root>/wiki-worker/build.js
   cp {skill_dir}/scripts/templates/sync-tags.js <project_root>/wiki-worker/sync-tags.js
   cp {skill_dir}/scripts/templates/docs.css <project_root>/wiki-worker/public/docs.css
   cp {skill_dir}/scripts/templates/package.json <project_root>/wiki-worker/package.json
   cp {skill_dir}/scripts/templates/wrangler.toml <project_root>/wiki-worker/wrangler.toml
   cp {skill_dir}/scripts/templates/worker.js <project_root>/wiki-worker/worker.js
   cp {skill_dir}/scripts/templates/redirects.json <project_root>/wiki-worker/redirects.json
   cp {skill_dir}/scripts/templates/removed.json <project_root>/wiki-worker/removed.json
   cp {skill_dir}/scripts/templates/indexnow.js <project_root>/wiki-worker/indexnow.js
   cp {skill_dir}/scripts/templates/sync-nanomd.js <project_root>/wiki-worker/sync-nanomd.js
   cp {skill_dir}/scripts/templates/demo.js <project_root>/wiki-worker/public/demo.js   # 僅前端套件（Step 5.1）
   ```
2. 先讀取 `build.js`，確認下列 placeholder 仍存在；**僅替換存在且值不同的 placeholder**，改為實際值（Step 0.3 收集的欄位）。目標值已正確時不寫入：

   | Placeholder                         | 來源                                                                                                                                                             |
   | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `{{SITE_NAME}}`                     | Step 0.3 `site_name`（套件專案＝`{owner}/{repo}`）。header logo 與首頁 h1 不吃這個值，範本固定用 `${REPO}`                                                       |
   | `{{DOMAIN}}`                        | Step 0.3 `domain`                                                                                                                                                |
   | `{{REPO}}`                          | `{owner}/{repo}`（Step 0.4 推導）                                                                                                                                |
   | `{{AUTHOR_NAME}}`                   | `~/.skill-readme-generate.json` `author_name`                                                                                                                    |
   | `{{AUTHOR_URL}}`                    | `~/.skill-readme-generate.json` `author_url`                                                                                                                     |
   | `{{AUTHOR_HANDLE}}`                 | `~/.skill-readme-generate.json` `github_owner`（作者帳號；repo 在組織底下時與 `{{REPO}}` 的 owner 不同）                                                         |
   | `{{GTAG_ID}}`                       | Step 0.3 `gtag_id`（留空則保持空字串）                                                                                                                           |
| `{{DEMO_SCRIPT}}` | 前端套件（Step 5.1 判準）：`https://cdn.jsdelivr.net/npm/{package}@{version}/dist/<瀏覽器建置檔>`，`{version}` 原樣保留由 build.js 代入 `package.json` 版本；非前端套件留空字串 |
| `// {{DEMO_SCRIPT_ATTRS}}` | 套件 script 標籤必須帶的額外屬性，展開為物件屬性（例：RenderJS `copyright: "Pardn Ltd"`）；套件不需要時保持空物件 |
| `// {{DEMO_LOG_IGNORE}}` | 套件自行印出、與範例無關的 console 輸出前綴（例：nanojson `"NanoJSON: https://"`），展開為字串陣列元素；預覽 log 區略過以這些前綴開頭的輸出；不需要時保持空陣列 |

`sync-tags.js` 同樣有一個 `{{REPO}}`，用同一個 `{owner}/{repo}` 值替換。

3. 將 `NAV` / `NAV_ZH_SECTION` / `NAV_ZH_LABEL` 這幾個物件依 Step 2 推導的頁面集合填入實際內容（**不得留 `// {{NAV}}` 等佔位註解**）
4. 將 `package.json` 與 `wrangler.toml` 內的 `{{REPO_NAME}}` 替換為 repo 名稱（lowercase，取 `{repo}` 的部分，不含 owner），使兩者 `name` 欄位皆為 `{repo}-wiki`
5. 於 `wiki-worker/` 下執行 `npm install` 與 `node sync-nanomd.js`（記錄 NanoMD 最新版、下載該版 `parser.css`、以 `--save-exact` 安裝同版本）

若 `wiki-worker/build.js` 已存在（非首次生成）：**每次都對齊最新範本**，不詢問使用者。

| 比對                                                                    | 動作                                                                                                                                                        |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 專案 `build.js` 的 `TEMPLATE_VERSION` 等於 `scripts/templates/build.js` | 只更新 `NAV`／`NAV_ZH_*` 物件                                                                                                                               |
| 低於範本，或找不到 `TEMPLATE_VERSION`（1.2.0 前的範本）                 | 重新複製 `build.js` 與 `sync-tags.js` 範本，依 Step 3.1 第 2 步重新填值，再放回既有的 `NAV`／`NAV_ZH_*` 頁面資料；舊範本低於 7.0.0 且沒有 `seo.json` 時，**重新複製前**先跑 `node {skill_dir}/scripts/migrate_seo_json.js wiki-worker/build.js wiki-worker/seo.json`，把舊範本內的 SEO 常數與 `DESCRIPTIONS`／`KEYWORDS` 物件原值搬進 `seo.json`，避免已上線的 SEO 值消失 |

`package.json` 的 `scripts` 也對齊範本（範本新增的流程如 IndexNow 串在 `deploy` 中），`name` 與相依版本不動；範本新增的腳本檔（如 `indexnow.js`）一併複製。

重新填值的來源：既有 `build.js` 的站台常數值 → `wiki-worker/.doc/seo/config.json` → Step 0.3 預設 fallback。新範本新增、但兩處都沒有值的欄位填預設值，並在回應中列出。`package.json`、`wrangler.toml` 不動，例外：`wrangler.toml` 缺 `[observability]` 區段時補上 `enabled = false`（使用者 2026-10-03 指定所有文件站關閉 Workers observability）；缺 `main = "worker.js"` 或 `[assets]` 的 `binding = "ASSETS"` 時補上，並複製範本 `worker.js`。既有專案的 `worker.js` 與範本不同（例如舊版把 404 一律 302 轉回 `/`）時，先以 `AskUserQuestion` 說明改動（不存在的網址改回 404 頁、`redirects.json` 的舊網址回 301）並取得同意才覆蓋；`redirects.json`、`removed.json` 不存在才從範本複製空檔。

專案端若有自行實作的範例機制（`<pkg>-demo` fence、`public/<pkg>-demo.js`、自訂 `renderDemos()`，例：QuickUI、NanoMD、nanojson），重新複製 `build.js` 後該機制會消失：把對應 code block 依 Step 5.1 改寫成 ` ```demo `（JS-only 範例補上掛載點 HTML 並包進 `<script>`），刪除舊的 `public/<pkg>-demo.js`，並把舊值填入 `DEMO_SCRIPT`。

讀 `scripts/templates/CHANGELOG.md` 定位差異：「破壞性變更」全部項目逐項比對專案現有檔案，命中即直接修改；回應中列出命中項與改動。

**為何：** 範本是同一份設計在所有專案的單一來源；逐項「找不到某字樣就移植某函式」的例外條款只擋得住當初寫進 SKILL.md 的那一項，其餘改動會靜默漏掉。歷史事故（go-llm-router 2026-10-02）：專案 `build.js` 停在 `TAGLINE` 與 `revealNav` 之前的版本，例外條款只移植了 `revealNav`，`TAGLINE` 一直沒進來。

### 側欄行為（範本內建）

| 行為                 | 實作                                                                                                                                                                      | 為何                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 載入時側欄捲到當前頁 | 頁面模板的 `revealNav()`：以 `.sidebar` 自身的 `scrollTop` 把 `.nav-item.active` 置中；載入時呼叫一次，手機版選單按鈕展開時再呼叫一次（收合時 `display:none` 量不到位置） | 頁數多時當前項目常在側欄可視範圍外，讀者看不出自己在哪一節。只捲側欄、不用 `scrollIntoView`，避免連帶捲動整頁 |
| 側欄不顯示 scrollbar | `docs.css`：`.sidebar{scrollbar-width:none}.sidebar::-webkit-scrollbar{display:none}`，仍可滾輪／觸控捲動                                                                 | 使用者要求；細條 scrollbar 在側欄是視覺雜訊                                                                   |

`docs.css` **每次生成都整檔覆蓋**，不論是否首次：

```bash
cp {skill_dir}/scripts/templates/docs.css <project_root>/wiki-worker/public/docs.css
cp {skill_dir}/scripts/templates/demo.js <project_root>/wiki-worker/public/demo.js   # 僅 DEMO_SCRIPT 有值時
```

**為何整檔覆蓋而非逐條補：** `docs.css` 與 `build.js` 是同一份設計的兩半——build.js 每新增一個 class（`nav-date`／`header-version`／`content .byline`／`pre.mermaid`），樣式就住在範本 css 裡。逐條檢查「有沒有某個字樣」只能擋住當初寫進 SKILL.md 的那一條，其餘新 class 會靜默沒有樣式：**HTML 完全合法、build 不報錯、SEO 檢查全過，只有人眼看得出版面壞掉**。歷史事故（go-bot 2026-09-20）：舊 css 缺 `.nav-date`／`.header-version`／`.content .byline` 三條，版本側欄的日期因為沒有 `float:right` 直接黏在 tag 後面渲染成 `v0.5.02026-09-20`，署名列也沒有分隔線；當時 SKILL.md 只要求檢查 `pre.mermaid`，所以三條全部漏掉。css 是生成資產，與 `public/*.html` 同級，專案端沒有客製它的正當理由。

對齊範本時**不保留舊範本的版面客製**——舊站看起來對的地方，可能只是新範本已改過的設計的舊版；例如 header logo 在範本是 `${REPO}`（`owner/repo`），沿用舊值會變成只有產品名。

### Step 3.1.1：範本版號與 CHANGELOG

修改 `scripts/templates/` 下任何檔案（`build.js`／`docs.css`／`sync-tags.js`／`demo.js`）時，同一次改動內：

1. 升 `build.js` 的 `TEMPLATE_VERSION`（新增功能 minor、修正 patch、移除或破壞相容 major）
2. 更新 `scripts/templates/CHANGELOG.md` 的「最新改動」日期
3. 本次含移除行為或需專案端處理的變更 → 寫進「破壞性變更」（一項一行、新者在上）；新增與修正不記錄。CHANGELOG 不寫版號

**為何：** 版號是 Step 3.1 判斷專案是否落後的唯一依據。讀完整規範（本檔＋`scripts/templates/`）即得最新規範；CHANGELOG 只負責快速定位專案現有檔案與最新規範的差異，命中即直接修改。只記破壞性變更，檔案不隨改動無限增長，落後多次的專案也能一次看完必須處理的項目；新增與修正的結果已在現行範本內，對齊即自動取得。

### Step 3.2：同步版本紀錄（GitHub Releases）

**版本紀錄不手寫，一律從 GitHub Releases 抓。** 編譯前執行：

```bash
cd <project_root>/wiki-worker && node sync-tags.js
```

| 項目          | 說明                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------- |
| 來源          | `GET /repos/{owner}/{repo}/releases`（分頁跟隨 `Link: rel="next"` 直到取完）                   |
| 產出          | 每個 release → `public/docs/tags/<tag>.md`（body 原文，CRLF 正規化為 LF）                      |
| 產出          | `public/docs/tags/manifest.json`：`{ "<tag>": "YYYY-MM-DD" }`（`published_at` 的日期部分）     |
| 認證          | 匿名可跑（60 req/h）；設 `GITHUB_TOKEN` 環境變數即帶 `Authorization: Bearer`，私有 repo 必須設 |
| 無 release 時 | 印 `No releases found` 並 exit 0；build.js 該區段整段跳過，站台照常編譯                        |

build.js 讀 `public/docs/tags/` 後自動產生：

| 產出            | 路徑              | 內容                                                                               |
| --------------- | ----------------- | ---------------------------------------------------------------------------------- |
| 版本索引        | `/released/`      | 依 minor 版本（`v0.28`）分組的全部 tag 清單 + 發布日期                             |
| 單版本頁        | `/released/<tag>` | 該 release 的 changelog；側欄為版本清單（含回文件站的連結）                        |
| Header 版本徽章 | 所有頁            | 最新 tag，連向站內 `/released/<tag>`（不外連 GitHub，讀者留在文件站）              |
| 側欄入口        | 所有文件頁        | 底部 `Released` / `版本紀錄` 連結                                                  |
| sitemap         | `sitemap.xml`     | 只輸出 `<loc>` 與 `<lastmod>`（Google 忽略 `priority`／`changefreq`）；release 頁 `lastmod` 取 manifest 日期 |

**tag 排序**：`semverSort` 依 `major.minor.patch` 數值降冪（`v` 前綴會被去掉，缺項視為 0），非三段式數字 tag 不保證排序正確。

**何時重跑**：專案發新版後、或使用者要求刷新文件站時；`--only` 模式下不重跑（版本紀錄與頁面內容無關）。

### Step 3.2.1：NanoMD 版本

頁面內容由 `@pardnchiu/nanomd` 在 build 時解析，`<head>` 內嵌同版本的 `parser.css`，載入同版本 `parser.js` 後執行 `Refresh()`；三者版本由 `nanomd/version.json` 決定。

| 時機                                    | 動作                                                                                                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 每次執行（含重生與範本對齊） | 先查 `npm view @pardnchiu/nanomd version`；`nanomd/version.json` 不等於 npm 最新版 → 執行 `node sync-nanomd.js`；範本 `package.json` 的 `@pardnchiu/nanomd` 也落後 → 依 Step 3.1.1 一併更新範本 |
| 首次生成、使用者要求換版 | `node sync-nanomd.js [x.y.z]`（不帶版號取 npm 最新版）：下載該版 `parser.css` 取代 `nanomd/parser.css`、寫入 `nanomd/version.json`、`npm install` 同版本 |
| build                                   | 已安裝版本與 `nanomd/version.json` 不符 → `[Conflict]` 中止；缺 `nanomd/*` → `[Not found]` 中止                                                          |

**為何：** 靜態 HTML、內嵌 CSS 與執行期 `parser.js` 任一版本不同，後載入的規則會蓋掉前面的，畫面與文件描述對不上（NanoMD 2026-10-20：內嵌新版 CSS 被 CDN 舊版 `parser.css` 蓋回，圖片又被撐滿寬度）。

### Step 3.3：編譯

寫完 `pages/*.md` 與更新 `NAV` 後，執行：

```bash
cd <project_root>/wiki-worker && node build.js
```

**驗證編譯結果**：檢查 stdout 每行 `OK: ...` 對應預期輸出路徑，`SKIP: <slug>.md not found` 代表 NAV 內宣告的頁面缺少對應 md 檔，須修正。有 release 時另有一行 `OK: N release pages + index`。

---

## Step 4：Home 頁面（`pages/home.md` + `pages/home.zh.md`）

**Home 內容來源是專案既有的 README，不另外撰寫 Highlights / Source 等自製區段。** 這是 Home 唯一的例外規則 —— Step 5「禁止把 README 整段搬進文件」只適用於主題頁，Home 本身就是 README 的鏡像。

### 內容來源優先序

| 頁面                     | 來源檔（依序找第一個存在的）                       | 找不到時                                                                        |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------- |
| `pages/home.md`（EN）    | 專案根目錄 `README.md`                             | 必須存在；README 缺失視為專案未就緒，中止生成並回報使用者                       |
| `pages/home.zh.md`（ZH） | 1. 專案根目錄 `README.zh.md` 2. `doc/README.zh.md` | 兩者皆無 → 將 `README.md` 完整翻譯為 `home.zh.md`（沿用 Step 5 的 ZH 翻譯策略） |

### 轉寫規則

- **README 全文逐字原樣複製**到 `home.md`／`home.zh.md`，不摘要、不改寫、不刪減任何區段（含徽章列、`<p align="center">`、Star history）；章節順序與標題層級與 README 完全一致
- 例外一：README 的已知限制區段（`Known Limitations`／`Limitations`／`Caveats`／`已知限制`／`限制` 等）整段不複製，見 Step 5「不寫已知限制」
- 例外二：README 開頭的最後更新日期行（`Last updated: ...`／`最後更新：...`）不複製——頁面日期由 `build.js` 依內容雜湊產生並顯示於 h1 下方，與 JSON-LD、sitemap `lastmod` 同值；複製進來會出現兩個可能不一致的日期，且日期行變動會讓內容雜湊變動
- README 內引用的本地圖片檔（如 `logo.svg`、`logo.png`、`doc/logo.svg`、`doc/logo.png` 等相對路徑圖片）**原樣複製檔案**到 `wiki-worker/public/assets/`（保留原檔名，去除 `doc/` 等來源前綴），並將 md 內對應的圖片路徑改寫為 `/assets/<檔名>`
- README 內的相對連結（如 `./doc/architecture.md`、`#features`）若指向 repo 內檔案，改寫成指向 GitHub blob 的絕對 URL（`https://github.com/{owner}/{repo}/blob/master/...`）；指向本文件內章節的錨點連結（`#section`）維持相對，因為 build.js 會用同一套 `slugify()` 產生 heading id
- 其餘內容（安裝步驟、功能說明、架構圖、授權）逐字保留，不精簡

---

## Step 5：主題頁面（`pages/<slug>.md` + `pages/<slug>.zh.md`）

### 區段順序（強制）

| 順序 | 區段                                                                  | 必要   |
| ---- | --------------------------------------------------------------------- | ------ |
| 0    | 標題（`# Page Title`）                                                | **是** |
| 1    | 一句話開場（描述本頁範圍；講不完就代表該拆頁，見 Step 2「頁面主軸」） | **是** |
| 2    | 主要章節（依頁面性質）                                                | **是** |
| 3    | （選用）Cross-references — 指向相關頁面 slug                          | 否     |

**規則：**

- **不**在 md 內放跨語言連結 blockquote —— build.js 已在頁面右下角渲染 `lang-fab` 語言切換浮動按鈕，md 內容本身純粹是該語言版本的內容
- **不**放生成標注 —— 文件站無需每頁重複「本文件由 SKILL 生成」；如需標注放進 repo 的 `README.md`
- **不**放徽章列 / Star history / Author 區段 / 版權 footer —— 這些屬 landing page（`wiki-worker/public/index.html`）或 `README.md`，不屬文件內容
- **不寫已知限制**：不開 `Known Limitations`／`Limitations`／`Caveats`／`已知限制`／`注意事項` 等段落，也不在其他段落以「目前不支援／尚未實作／限制」列舉缺陷。行為本身的邊界（參數合法範圍、錯誤時回傳什麼）照常寫在對應功能說明裡 —— 使用者指定文件站只描述系統能做什麼

### Step 5.1：前端套件的即時範例（強制）

目標：讀者在程式碼正下方直接看到它跑起來的結果，不必自己建頁面試。

**判準（全部成立才是前端套件）：**

| 條件                | 驗證方式                                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 在瀏覽器執行        | 建置產物註冊 `window.X`（UMD／IIFE）、`package.json` 有 `browser`／`unpkg`／`jsdelivr` 欄位，或原始碼操作 `document`／DOM                                         |
| 已發佈且 CDN 可取得 | `curl -sI https://cdn.jsdelivr.net/npm/{package}@{version}/dist/<檔>` 回 200；`package.json` 的版本尚未發佈時，`DEMO_SCRIPT` 寫死最新已發佈版本，不用 `{version}` |

成立時 `DEMO_SCRIPT` 必填，build.js 會讓**每一頁**（文件頁、版本頁）的 `<head>` 都以 `defer` 載入該腳本；不成立則留空，以下規則不適用。

**寫法：** 主題頁中每個「能在瀏覽器直接執行的使用範例」一律寫成 ` ```demo ` fence，不用 ` ```html `／` ```javascript `；build.js 會在程式碼正下方接上即時預覽。

<example>
````markdown
```demo
<section id="editor"></section>
<script>
  const editor = new JSONEditor({
    id: "editor",
    fill: false,
    json: { name: "NanoJSON" },
    when: { rendered: () => console.log(editor.json) },
  });
</script>
```
````
</example>

| 規則                                                                                               | 為何                                                      |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 內容是完整 HTML：掛載點元素＋`<script>`，可整段複製到空白頁就能跑                                  | iframe 只放這段內容；缺掛載點就是空白預覽                 |
| 不寫套件的 `<script src>`（寫了也會被 `demo.js` 移除）                                             | iframe 已先載入 `DEMO_SCRIPT`，重複載入會重複初始化       |
| 要讀者看到的結果（序列化輸出、鉤子觸發順序、錯誤）用 `console.log` 印出                            | 預覽下方的 log 區只接 console 與未捕捉錯誤                |
| 需要填滿容器的元件給明確尺寸（如 `fill: false` 或容器設 `height`）                                 | iframe 高度依內容自動調整，絕對定位填滿的元件高度會是 0   |
| 每個概念頁、API 頁、生命週期頁至少一個範例，展示該頁主題的行為；記錄邊界或缺陷的段落附上重現範例   | 範例的價值是驗證文件描述；只放在 Getting Started 等於沒有 |
| EN／ZH 兩版程式碼逐字相同，只翻譯前導句與程式碼註解                                                | 兩語言頁面行為必須一致                                    |
| 不可在瀏覽器執行的區塊維持一般 fence：`npm install`、ESM `import` 行、型別簽章、Node／伺服器端程式 | 這些放進 iframe 只會報錯                                  |

**驗證（強制）：** 每個 ` ```demo ` 都要在 headless Chrome 實際執行一次，確認預覽有渲染、log 內容與文件描述一致、沒有非預期錯誤；與文件描述不符時以實際行為為準修正文件。

**為何：** 前端套件的文件只讀程式碼，讀者無法確認描述是否正確；即時預覽同時是給讀者的範例與給作者的回歸測試。歷史事故（nanojson 2026-10-04）：型別系統頁寫 `{"a": null}` 會拋 TypeError，實際執行範例後才發現是 `ReferenceError: _null is not defined`。

### ZH 翻譯策略

- 技術術語第一次出現 = 英文 + 中文註解，後續純中文
- Function / API / 環境變數名稱：保留原文（`exec.Execute()`、`MAX_HISTORY_MESSAGES`）
- 程式碼區塊不翻譯，只翻譯註解
- 章節標題：翻譯（`## Installation` → `## 安裝`）
- 表格表頭：翻譯
- ZH 與 EN **內容對齊**（同樣的章節、同樣的 table 列數），但語句可順應中文表達調整

---

## Step 6：靜默修正規則

**生成時對照當前專案狀態，靜默修正使用者 draft / 既有文件中的常見錯漏：**

| 偵測                                    | 動作                             |
| --------------------------------------- | -------------------------------- |
| Go 版本與 `go.mod` 不符                 | 改為 `go.mod` 寫的               |
| Repo 路徑與 `git remote` 不符           | 改為實際 remote                  |
| 設定路徑大小寫與 code 不符              | 改為 code 用的（多為 lowercase） |
| Tool / function / env name 拼寫錯       | 改為實際註冊名                   |
| Provider / 子系統數量陳述與實際清單不符 | 改為實際數量                     |

**為何靜默：** 使用者 draft 通常是備忘錄；文件是給其他人看的 source of truth，須對齊 code，不對齊 draft。

---

## Step 8：SEO / AEO / GEO（一律交給 `/seo-optimize`）

本 skill 不做 SEO 研究、不寫任何 SEO 值。內容寫完、編譯過一次後，必須接著跑 `/seo-optimize`；它依最新研究產出 `wiki-worker/seo.json`（欄位與契約見 `{skill_dir}/../seo-optimize/scripts/wiki_worker_contract.md`），再重跑 `node wiki-worker/build.js`。

| 狀態 | 動作 |
| --- | --- |
| 可用 skill 清單含 `seo-optimize`，或 `{skill_dir}/../seo-optimize/SKILL.md` 存在 | Step 3.3 編譯後執行 `/seo-optimize <project_root>` |
| 不存在 | `git clone --depth 1 https://github.com/agenvoy/skill-seo-optimize {skill_dir}/../seo-optimize` 後執行 |
| clone 失敗 | 停止並回報 `[Unavailable] seo-optimize: ...`；只有內容頁、沒有 SEO 產物的站不可部署 |
| `--only` 模式 | 只重生指定頁；新頁或頁面主題有變時仍要跑 `/seo-optimize` 補該頁的 description／keywords |

`/seo-optimize` 的研究、關鍵字詢問、規劃確認、`gh repo edit` 詢問、報告與「本次發現的新規範」表皆依它自身流程。它要改的範本機制（新規格、新輸出格式）落在 `{skill_dir}/scripts/templates/`，依 Step 3.1.1 升版並寫 CHANGELOG，再依 Step 3.1 同步回專案。

**為何：** 內容與 SEO 分兩個 skill 各自負責一件事。內容的價值是完整、正確；SEO 值必須依當次研究決定，寫死在內容生成裡會過時，兩邊各寫一份會漂移。

---

## Step 7：驗證檢查清單

完成前驗證：

### 結構

- [ ] `wiki-worker/build.js` 存在且無殘留 `{{PLACEHOLDER}}` 或 `// {{NAV}}` 等佔位註解
- [ ] 專案 `build.js` 的 `TEMPLATE_VERSION` 與 `scripts/templates/build.js` 相同
- [ ] 本次若改過 `scripts/templates/`：`TEMPLATE_VERSION` 已升版，`CHANGELOG.md` 的「最新改動」日期已更新，破壞性變更已寫入「破壞性變更」
- [ ] `check_coverage.py` exit 0（`missing`／`removed`／`undocumented_removals` 皆為空）
- [ ] `wiki-worker/public/docs.css` 與 `scripts/templates/docs.css` 逐字相同（`diff` 無輸出）
- [ ] build.js 輸出的每個自有 class 在 docs.css 都找得到規則（外部來源的 `fa-*`（Font Awesome）、`language-*`、`nanomd`／`md-*`／`prettyprint`／`copy`（NanoMD 輸出，樣式由 `parser.css` 提供）除外）：

```bash
grep -oE 'class="[a-zA-Z0-9 _-]+"' wiki-worker/build.js | grep -oE '[a-zA-Z][a-zA-Z0-9-]+' \
  | grep -vE '^(fa|fa-.*|language-.*|nanomd|md-.*|prettyprint|copy|class)$' | sort -u \
  | while read -r c; do grep -q "\.$c" wiki-worker/public/docs.css || echo "MISSING CSS: .$c"; done
```

      有輸出代表新 class 沒樣式：先把規則補進 `scripts/templates/docs.css`，再整檔覆蓋回專案

- [ ] `wiki-worker/sync-tags.js` 存在且 `REPO` 已是實際 `{owner}/{repo}`，無殘留 `{{REPO}}`
- [ ] `wiki-worker/sync-nanomd.js` 與範本相同；`nanomd/version.json` 版本＝`npm view @pardnchiu/nanomd version`（npm 最新版）＝`package.json` 的 `@pardnchiu/nanomd`（無 `^`）＝已安裝版本＝範本 `package.json` 的版本，`nanomd/parser.css` 為該版內容
- [ ] 前端套件（Step 5.1）：`DEMO_SCRIPT` 解析後的 URL `curl -sI` 回 200；`public/demo.js` 與 `scripts/templates/demo.js` 逐字相同；每個編譯後 HTML 都含 `data-demo defer` 的腳本；專案端舊的 `<pkg>-demo` 機制已移除
- [ ] `wiki-worker/package.json` 與 `wiki-worker/wrangler.toml` 存在，`name` 皆為 `{repo}-wiki`，無殘留 `{{REPO_NAME}}`
- [ ] `wiki-worker/wrangler.toml` 含 `[observability]` `enabled = false`
- [ ] `wiki-worker/worker.js` 存在且 `wrangler.toml` 含 `main = "worker.js"` 與 `binding = "ASSETS"`；`redirects.json`、`removed.json` 存在；部署後 `curl -sI {domain}/__not-found__` 回 `404` 且內容為 404 頁、`redirects.json` 任一舊網址回 `301` 到新網址
- [ ] `wiki-worker/public/docs/pages/home.md` 存在且內容逐字鏡像 `README.md`
- [ ] README 引用的本地圖片（如有）已原樣複製到 `wiki-worker/public/assets/`，且 `home.md`／`home.zh.md` 內圖片路徑已改寫為 `/assets/<檔名>`
- [ ] 每個 NAV 內宣告的 slug 都有對應 `pages/<slug>.md`

### 編譯

- [ ] `node wiki-worker/build.js` 執行成功，`SKIP` 訊息數為 0
- [ ] `wiki-worker/public/index.html` 存在（EN 文件首頁）
- [ ] 有 `.zh.md` 的頁面都產出對應 `wiki-worker/public/zh/<slug>.html`
- [ ] 有 `seo.json` 時 `wiki-worker/public/sitemap.xml`／`robots.txt`／`llms.txt` 已更新

### 版本紀錄（repo 有 GitHub Release 時）

- [ ] `node sync-tags.js` 執行成功，`public/docs/tags/` 內 `.md` 數量與 GitHub release 數一致，且 `manifest.json` 每個 tag 都有日期
- [ ] `public/released/index.html` 與每個 `<tag>.html` 已產出
- [ ] Header 版本徽章顯示最新 tag 且連向站內 `/released/<tag>`
- [ ] `sitemap.xml` 含 `/released/` 與各 tag URL

### 每個主題頁（EN + ZH 各驗證）

- [ ] 標題與 NAV 內 `label` 語意一致
- [ ] 章節結構與對向語言版本對齊
- [ ] 程式碼區塊指定語言識別碼
- [ ] 前端套件：可在瀏覽器執行的使用範例皆為 ` ```demo `，且每個都已在 headless Chrome 實跑過、log 與文件描述一致
- [ ] **無** 徽章 / star history / author 區段 / 版權 footer / 生成標注 / 已知限制段落

### SEO（Step 8）

- [ ] 完整生成後已執行 `/seo-optimize`，`wiki-worker/seo.json` 存在，且之後重跑過 `node build.js`（輸出無 `[Not found] seo.json`）
- [ ] 本 skill 未寫入 `seo.json` 或任何 SEO 值；`build.js` 無殘留 `{{...}}` placeholder

### 共通

- [ ] 所有 `{owner}` / `{repo}` / `{author_name}` placeholder 已替換
- [ ] 所有 slug 使用 lowercase-kebab-case
- [ ] `--only` 模式下未指定頁面未被讀取或覆寫

---

## 工作流程總結

````
0. 作者設定 → setup_config.py check；首次生成額外詢問 site_name / domain / gtag_id（寫入 wiki-worker/.doc/seo/config.json）
0.5 覆蓋率 → git fetch --tags；check_coverage.py 找出缺漏與已移除符號（Step 1.4）
1. 解析參數 → REPO_PATH / ONLY / PAGES
2. 粗掃專案 → analyze_project.py（取符號索引）
3. 讀完整檔 → 對每頁必讀的原始碼檔逐檔完整讀取（不只看 analyzer 摘要）
4. 推導頁面 → 預設集 + CLAUDE.md 一級標題派生；每頁決定 slug / label / section
5. 首次生成 → 複製 build.js / sync-tags.js / docs.css / package.json / wrangler.toml 範本，替換站台 placeholder，填入 NAV 等物件；舊範本 < 7.0.0 先跑 migrate_seo_json.js
6. 生成 Home → pages/home.md + home.zh.md
7. 生成每頁 → ZH 先寫、EN 翻譯（對齊章節結構），寫入 pages/<slug>.md(.zh.md)；前端套件的使用範例寫成 ```demo 並實跑驗證（Step 5.1）
8. 靜默修正 → 對照 code / config 修正常見錯漏
9. 同步版本 → node wiki-worker/sync-tags.js（`--only` 模式跳過）
10. 編譯 → node wiki-worker/build.js；檢查 stdout 無 SKIP
11. SEO → 執行 /seo-optimize（未安裝則 clone，失敗即停止）產出 seo.json，重新編譯
12. 驗證 → 跑檢查清單；連結 / 對向檔案存在性 + 引用的 symbol 確實存在；check_coverage.py exit 0
````

---

## 禁止行為

| 禁止項                                                                          | 為何                                                                                                                                                                    |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 手動編輯 `wiki-worker/public/*.html` 或 `wiki-worker/public/zh/*.html`          | 這些是編譯產出，下次 `node wiki-worker/build.js` 會覆蓋；改動應動 `pages/*.md`                                                                                          |
| 套件專案的 `site_name` 只寫專案名、省略 `{owner}/`                              | 同名套件在 npm／pkg.go.dev／GitHub 上大量存在，搜尋結果與 AI 引用需要 owner 才能定位到正確的那一個；只有具獨立品牌名的產品才免除                                        |
| 在專案端維護 `docs.css`（逐條補規則、保留舊版樣式）                             | css 與 build.js 是同一份設計；專案端分岔後，新 class 會沒有樣式而版面靜默壞掉，且不會被任何自動檢查攔到。要改樣式就改 `scripts/templates/docs.css` 再整檔覆蓋回所有專案 |
| 改了範本 `build.js` 的版面／meta 邏輯卻沒同步 `scripts/templates/docs.css`      | 新 class 沒有對應規則＝上線即破版；兩檔必須同一次改完                                                                                                                   |
| 手寫或修改 `public/docs/tags/*.md`、`manifest.json`、`public/released/*.html`   | 版本紀錄唯一 source of truth 是 GitHub Releases；手改會被下次 `sync-tags.js` / `build.js` 覆蓋，且讓站上內容與 release 頁不一致                                         |
| 為版本紀錄寫 ZH 版或翻譯 changelog                                              | release body 由發版流程產出且會持續新增，翻譯必然落後；`/released/` 刻意設計為 EN only（無 lang-fab、無 hreflang）                                                      |
| slug 使用大寫或底線                                                             | 與 URL path／檔名慣例不符，導致 build.js 找不到對應 md                                                                                                                  |
| 在 md 內放跨語言 blockquote 連結                                                | build.js 已用 `lang-fab` 統一處理語言切換，md 內重複會造成版面衝突                                                                                                      |
| 主題頁加 Star history / 徽章 / 生成標注                                         | 文件站不是 landing page，這些屬 `wiki-worker/public/index.html` 或 `README.md`                                                                                          |
| 寫死頁面集合（不分析 CLAUDE.md）                                                | 與專案脫節                                                                                                                                                              |
| 翻譯 function / env / API 名稱                                                  | 識別符跨語言一致才能 grep                                                                                                                                               |
| 把 README 內容整段搬進文件                                                      | 讀者已看過 README；文件應深入細節                                                                                                                                       |
| 跳過靜默修正                                                                    | 文件對齊 code 是核心價值                                                                                                                                                |
| **僅靠 analyzer JSON 生成內容、未讀完整檔**                                     | analyzer 只抽符號名與 signature，function body 內的邏輯／分支／retry 策略全部漏掉，產出會是「正確但空洞」的文件                                                         |
| **引用未讀過的 symbol / 檔案路徑**                                              | 幻覺風險最高來源；寫入前必須 grep 確認簽名與行號                                                                                                                        |
| **改動 build.js 邏輯時未同步 `scripts/templates/build.js`**                     | 若客製化屬通用改進（非該專案特有），應回饋進 skill 範本，否則下個專案重複踩坑                                                                                           |
| 在本 skill 內重建 SEO 研究、規則或分析腳本                                      | SEO 規則只在 `/seo-optimize` 維護一份；兩邊各帶一份會各自漂移                                                                                                           |
| 未經使用者同意就拆頁、刪頁、改 slug、換掉既有 `worker.js`，或為了讓 build 通過自行加 `redirects.json`／`removed.json` 條目 | 已上線網址有外部連結與搜尋結果；拆分與 404 是使用者的決策（2026-10-23） |
| 本 skill 寫入 `seo.json`，或在 `build.js`、`pages/*.md` 填 title／description／keywords／JSON-LD／實體等 SEO 值 | SEO 值由 `/seo-optimize` 依當次研究決定；內容生成時寫死會過時，且與 `seo.json` 形成兩份事實來源 |
| 以檔案 mtime 或建置時間當 `dateModified`                                        | 檔案重新產生就會變動，內容沒改日期卻更新，屬操弄新鮮度（A10）                                                                                                           |
| 刪除或手改 `public/docs/dates.json`                                             | 所有頁面的發布日期會重置成重建當天                                                                                                                                      |
| 程式碼已有的公開功能沒寫進文件                                                  | 讀者不知道功能存在；文件的價值是完整                                                                                                                                    |
| 從文件刪除已移除的 API，或移除紀錄不寫版本號                                    | 升級中的讀者需要知道符號去哪了、從哪一版開始；`Removed in` 是 `check_coverage.py` 辨識移除紀錄的關鍵字                                                                  |
| 非首次生成時沿用舊版範本、只挑部分函式移植                                      | 逐項移植會靜默漏掉其他改動；一律依 `TEMPLATE_VERSION` 整份對齊                                                                                                          |
| `/seo-optimize` 查到範本層級的新規格卻只改單一專案或列為選用                    | 規格更新直接進 `scripts/templates/` 並升版，再同步到專案（Step 8）                                                                                                    |
| 改範本卻沒升 `TEMPLATE_VERSION`／沒寫 CHANGELOG                                 | 專案端無法偵測落後，也無法快速定位需修改的差異                                                                                                                          |
| 前端套件的使用範例只寫成一般 code block，沒有即時預覽                           | 讀者無法確認描述是否正確，文件錯誤也不會被發現（見 Step 5.1 歷史事故）                                                                                                  |
| 在專案端另寫 `<pkg>-demo` fence／執行器                                         | 與範本分岔，下次對齊範本時會整個消失；通用改進一律改 `scripts/templates/`                                                                                               |
| 範例未實際執行就寫進文件                                                        | 預覽壞掉或與描述不符只有人眼看得出，build 與 SEO 檢查都不會攔                                                                                                           |
