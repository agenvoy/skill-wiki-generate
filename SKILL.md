---
name: wiki-generate
description: 從原始碼分析自動生成雙語 GitHub Wiki。當使用者請求為專案建立 Wiki（多頁文件）、需要在 .wiki/ 目錄下生成英文（Page.md）與繁體中文（Page.zh.md）成對檔、或希望為函式庫／CLI 工具建立可掛入 GitHub Wiki 的多頁知識庫時使用。
---

# Wiki 產生器

從原始碼、CLAUDE.md、`doc/` 既有文件與專案結構分析，產生雙語 GitHub Wiki（成對的 `.md` 與 `.zh.md`）。

## 指令語法

```
/wiki-generate [private] [REPO_PATH] [--only <pages>] [--pages <list>]
```

### 參數（全部選填）

| 參數 | 格式 | 範例 | 行為 |
|---|---|---|---|
| `private` | 關鍵字 | `private` | Home 跳過 Stars / contributor wall block |
| `REPO_PATH` | `github.com/{owner}/{repo}` | `github.com/foo/bar` | 覆蓋預設 owner / repo |
| `--only <pages>` | 逗號分隔 | `--only home,configuration` | 僅重生指定頁；其他頁不讀不寫 |
| `--pages <list>` | 逗號分隔 | `--pages getting-started,api-reference,faq` | 覆蓋自動推導的頁面清單 |

**參數識別規則：** 順序獨立，依關鍵字 / 路徑模式 / `--flag` 解析。

### `--only` vs `--pages`

| 場景 | 使用 |
|---|---|
| 已生成 wiki，只想刷新 1–2 頁 | `--only` |
| 第一次生成、想自定頁面集合 | `--pages` |
| 預設 | 不傳；分析專案後自動推導頁面集 |

`--only` 模式下：
- 未指定的頁面**不得讀取、不得覆寫**
- Home 若不在 `--only` 內也不動（即使有新頁面被加入也不更新 Home table）
- `private`／`REPO_PATH` 仍套用至重生的頁面

---

## Step 0：作者設定（共用 readme-generate config）

**Wiki 生成需要的作者資訊（name / email / url / github_owner）與 readme-generate 相同，刻意共用一份 config 避免重複設定。腳本本身已隨 skill 複製一份至本地，不依賴 readme-generate 是否安裝。**

### 設定檔

```
~/.skill-readme-generate.json
```

（檔名沿用 readme-generate 命名以保持兩 skill 共用同一份 config，避免使用者在兩處重複輸入相同資料。）

### 執行協議

**Step 0.1：檢查設定**

```bash
python3 ~/.claude/skills/wiki-generate/scripts/setup_config.py check
```

| Exit Code | stdout | 動作 |
|---|---|---|
| `0` | 單行 JSON | 解析後跳到 Step 1 |
| `1` | （無） | 進入 Step 0.2 |

**Step 0.2：收集輸入（缺檔時）**

用 `AskUserQuestion` 工具依序詢問四欄位：`author_name` / `author_email` / `author_url` / `github_owner`，再呼叫：

```bash
python3 ~/.claude/skills/wiki-generate/scripts/setup_config.py write \
    "{author_name}" "{author_email}" "{author_url}" "{github_owner}"
```

**Step 0.3：覆蓋優先序**

| 來源 | 優先 |
|---|---|
| `REPO_PATH` 指令參數 | 最高（owner / repo） |
| `~/.skill-readme-generate.json` | 次高（其他作者欄位） |
| `git remote get-url origin` | 第三 |
| 資料夾名稱 | fallback |

---

## Step 1：分析專案

### Step 1.1：執行 analyzer 取得符號清單（粗掃）

```bash
python3 ~/.claude/skills/wiki-generate/scripts/analyze_project.py /path/to/project
```

**輸出**：language / files / functions / types / dependencies 的 JSON 摘要。

**用途**：作為「該讀哪些檔」的索引，**不**作為 wiki 內容生成的依據。analyzer 用 regex 抽符號，會遺漏：

- 函式 body 內的實際邏輯／流程／錯誤分支
- 巢狀 type 與 closure 中的隱含介面
- 跨檔依賴的真實呼叫關係
- 註解中的設計決策、TODO、限制
- mermaid／表格／範例所需的完整 context

### Step 1.2：讀取完整檔案（強制）

**Wiki 生成不可只靠 analyzer 摘要**。針對每個將生成的 wiki 頁，**必須用 `Read` 工具完整讀取**對應的原始碼檔案與既有文件。

| 頁面類型 | 必讀檔案 |
|---|---|
| **任何頁** | `CLAUDE.md`（根，整份） |
| **Architecture** | `doc/architecture.md`（整份）+ `analyze_project.py` 列出的核心模組所有 `.go` / `.py` / `.ts` 檔 |
| **Core-Concepts** | 主要 entry point（`main.go` / `cmd/*/main.*` / `index.ts`）+ 核心 dispatch / loop 檔（整檔，不抓片段） |
| **Configuration** | `.env.example` 整份 + 所有 `os.Getenv` / `process.env` 呼叫所在檔（用 grep 定位後整檔讀） |
| **CLI-Reference** | `main.*` + flag / cobra / argparse 註冊處所在檔（整檔）+ `makefile` |
| **API-Reference** | 所有 exported types / functions 所在的檔案（整檔，不只看 signature） |
| **Skill-System / Tools / 子系統頁** | 對應 `extensions/skills/*/SKILL.md` 整份 + 對應實作檔 |
| **Getting-Started** | `README.md` + `Makefile` + `Dockerfile`（如有）+ entry point |

**為何：**

1. **Wiki 是 source of truth 文件**：讀者打開 wiki 是要學整個系統運作，分支邏輯／邊界條件不能漏。analyzer 只看符號名，講不清楚「這個函式的 retry 策略是什麼」、「這個 dispatch 有幾種 path」
2. **避免幻覺**：未讀的檔案不能寫進 wiki。寫入前 grep 一次確認 symbol 存在、簽名正確
3. **Mermaid 結構真實性**：架構圖的 box / arrow 必須對應實際 import / call graph，僅靠 type 名稱會編造關係

**操作建議：**

- 用 `Read` 工具，**不傳 `offset` / `limit`**（除非檔案 > 2000 行才分段讀）
- 多檔讀取**並行呼叫**，不要序列化
- 讀過的檔案在生成時可引用 `path:line` 讓讀者跳轉
- 若檔案過大（> 2000 行）→ 拆段讀完整段，禁止只讀前 N 行就下結論

### Step 1.3：頁面結構額外來源

| 路徑 | 用途 |
|---|---|
| `CLAUDE.md`（根） | 真理來源；架構 / 規範 / 禁止事項 |
| `doc/architecture.md` | 模組關係；可拆成多頁 |
| `doc/doc.md` | 既有技術文件；對應 Configuration / CLI Reference 頁 |
| `extensions/skills/*/SKILL.md` | Skill 系統頁面所需 |
| `makefile` / `package.json` / `pyproject.toml` | CLI 指令清單 |
| `.env.example` | 環境變數清單 |

---

## Step 2：推導頁面集合

### 預設頁面集（自動推導）

| 頁 | 觸發條件 | 內容 |
|---|---|---|
| **Home** | 永遠 | 概覽、雙語樹狀目錄、生成標注 |
| **Getting-Started** | 永遠 | 前置需求、安裝、第一次執行 |
| **Architecture** | 專案有 `doc/architecture.md` 或 CLAUDE.md 含模組關係描述 | 概覽 Mermaid + 分層表 + 跨切原則；連結至 `doc/architecture.md` 完整版 |
| **Core-Concepts** | 任何非 trivial 專案 | 核心抽象、執行模型、邊界 |
| **Configuration** | `.env.example` 存在或 `os.Getenv` 多處 | 設定檔結構、env 變數 |
| **CLI-Reference** | `main.go` + flag 派發、`makefile` 含可執行 target | 主指令、子指令 |
| **API-Reference** | 函式庫專案（無 main、有 exported types） | exported API |

**Architecture 與 doc/architecture.md 的分工：**

| 文件 | 範圍 | 圖數 |
|---|---|---|
| Wiki Architecture 頁 | **單張**系統概覽 + 分層表 + 跨切原則 + 延伸閱讀連結 | **1** |
| `doc/architecture.md` | 模組級全展開（per-module 圖、sequence、狀態機） | 8–10+ |

**Wiki Architecture 嚴格只放一張概覽 Mermaid。** 流程細節（dispatch、sequence、狀態機）一律不重複，原因：

1. **流程圖該分開放** —— dispatch 屬 Core-Concepts、sequence／state machine 屬 doc/architecture.md，wiki Architecture 頁只負責「整體層級關係」
2. **避免讀者重複看同樣的圖** —— 同一張 sequence 圖出現在 Architecture 與 doc/architecture.md 是 noise，不是 redundancy
3. **Wiki 不是 doc 的 mirror** —— wiki 是入口、各頁應 self-contained 但聚焦單一觀察角度

**禁止**整段搬 `doc/architecture.md`，也**禁止**在 Wiki Architecture 頁塞超過一張 Mermaid。要再加圖→放對應 topic 頁（dispatch → Core-Concepts、sequence → doc/architecture.md）。

### 專案特定頁面（從 CLAUDE.md 一級標題推導）

掃描 CLAUDE.md 的 `##` 一級標題；任何顯著的「子系統」或「模組」段落（≥ 50 行）即可成為獨立 wiki 頁。例：

| CLAUDE.md 段落 | 推導頁名 |
|---|---|
| `## MCP client` | `MCP-Integration` |
| `## Sandbox` | `Security-and-Sandbox` |
| `## Memory layer` | `Memory-System` |
| `## Tool Subsystem` | `Tools` |
| `## Skill 系統` | `Skill-System` |

### 命名規則

- **檔名 = 頁標題**，Title-Case-With-Dashes
  - `Getting Started` → `Getting-Started.md`
  - `Memory System` → `Memory-System.md`
  - `Security and Sandbox` → `Security-and-Sandbox.md`
- 頁名直接對應 GitHub Wiki URL
- ZH 版加 `.zh` 中綴：`Getting-Started.zh.md`

### 預設頁數

通常 **6–12 頁**。少於 6 表示專案太小（README 即足夠）；超過 12 應拆專案。

---

## Step 3：寫入位置

```
<project_root>/.wiki/
├── Home.md                       (EN，雙語樹狀目錄表)
├── Getting-Started.md            (EN)
├── Getting-Started.zh.md         (ZH)
├── Core-Concepts.md
├── Core-Concepts.zh.md
└── ...
```

**為什麼 `.wiki/` 而非 `wiki/`：** 慣例上 `.wiki/` 視為 sidecar、不影響 build；要推到 GitHub Wiki repo 時只需把 `.wiki/*.md` 推到對應的 `<repo>.wiki.git`。

---

## Step 4：Home 頁面（EN，雙語樹狀目錄）

**Home 永遠英文主體；表格中央雙語列表。**

### 順序（強制）

| 順序 | 區段 | 必要 |
|---|---|---|
| 0 | 生成標注 + `***` | **是** |
| 1 | 專案標題 + 一句話定位 | **是** |
| 2 | Highlights（3–6 個 bullet） | 否 |
| 3 | 雙語頁面表 | **是** |
| 4 | Source 區段（repo / spec 連結） | 否 |
| 5 | （public 模式）Star history block | 否 |

### 順序 0：生成標注

```markdown
> [!NOTE]
> This wiki was generated by [SKILL](https://github.com/pardnchiu/skill-wiki-generate).

***
```

**規則：** 通知後必接 `***` 分隔線。標注內**不**包含 contributor 圖、不重複 README 內容；wiki 是文件層、不是 landing page。

### 順序 3：雙語頁面表

```markdown
## Pages

| English | 中文 |
|---|---|
| [Getting Started](Getting-Started.md) | [新手入門](Getting-Started.zh.md) |
| [Core Concepts](Core-Concepts.md) | [核心概念](Core-Concepts.zh.md) |
| ... | ... |
```

**規則：**
- 左欄全 EN（包含表頭 `English`）
- 右欄全 ZH（包含表頭 `中文`）
- 連結直指 sibling `.md` 檔（**不**加 `./` prefix；GitHub Wiki 渲染兩者皆可，但 sibling 寫法跨 wiki / repo 兩處皆通）
- 列順序 = 從基礎到進階：Getting Started → Core Concepts → 主題頁 → Reference → Configuration

### 順序 4：Source

```markdown
## Source

- Repository: [{owner}/{repo}](https://github.com/{owner}/{repo})
- Architecture: [doc/architecture.md](https://github.com/{owner}/{repo}/blob/master/doc/architecture.md)
- Living spec: [CLAUDE.md](https://github.com/{owner}/{repo}/blob/master/CLAUDE.md)
```

絕對 URL，不依賴 wiki 與 main repo 的相對位置。

### Home 中文化策略

**不**做 `Home.zh.md`。Home 是 wiki 入口，須單一檔；雙語訊息已在表格內並列。GitHub Wiki UI 將 Home 視為特殊頁，雙頁會造成 sidebar 重複。

---

## Step 5：主題頁面（EN + ZH 成對）

### 區段順序（強制）

| 順序 | 區段 | 必要 |
|---|---|---|
| 0 | 標題 + 跨語言連結 | **是** |
| 1 | 一句話開場（描述本頁範圍） | **是** |
| 2 | 主要章節（依頁面性質） | **是** |
| 3 | （選用）Cross-references — 指向相關 wiki 頁 | 否 |

### 順序 0：標題 + 跨語言連結

**EN（`Page-Name.md`）：**
```markdown
# Page Name

> [中文](Page-Name.zh.md)
```

**ZH（`Page-Name.zh.md`）：**
```markdown
# 頁面中文標題

> [English](Page-Name.md)
```

**規則：**
- 跨語言連結用 blockquote 單行，置於標題之下、第一個 `##` 之前
- 不加 `***` 分隔線（過度切割）

### 主題頁不該有的東西

| 元素 | 為何不放 |
|---|---|
| 生成標注 | Home 已標；每頁重複是 noise |
| 徽章列 | wiki 不是 landing；徽章在 README |
| Star history | 同上 |
| Author 區段 | wiki 是文件、不是個人作品集 |
| 版權 footer | 每頁 footer 對讀者無價值；License 連結進 README 即可 |

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

| 偵測 | 動作 |
|---|---|
| Go 版本與 `go.mod` 不符 | 改為 `go.mod` 寫的 |
| Repo 路徑與 `git remote` 不符 | 改為實際 remote |
| 設定路徑大小寫與 code 不符 | 改為 code 用的（多為 lowercase） |
| Tool / function / env name 拼寫錯 | 改為實際註冊名 |
| Provider / 子系統數量陳述與實際清單不符 | 改為實際數量 |

**為何靜默：** 使用者 draft 通常是備忘錄；wiki 是給其他人看的 source of truth，須對齊 code，不對齊 draft。

---

## Step 7：驗證檢查清單

完成前驗證：

### Home
- [ ] `Home.md` 存在
- [ ] 順序 0：生成標注 + `***`
- [ ] 順序 3：雙語頁面表存在，每列雙欄連結指向實際存在的 `.md` 檔
- [ ] 連結無 broken（每個 `[xxx](File.md)` 對應 `.wiki/File.md` 存在）
- [ ] **無** `Home.zh.md`

### 每個主題頁（EN + ZH 各驗證）
- [ ] 順序 0：跨語言連結 blockquote 存在
- [ ] 順序 0：對向語言檔存在於 `.wiki/`
- [ ] 標題 = 檔名（去除 `-` 與 `.zh` 後）
- [ ] 章節結構與對向語言版本對齊
- [ ] 程式碼區塊指定語言識別碼
- [ ] **無** 徽章 / star history / author 區段 / 版權 footer
- [ ] **無** 重複的「This wiki was generated by ...」標注

### 共通
- [ ] 所有 `{owner}` / `{repo}` / `{author_name}` placeholder 已替換
- [ ] 所有檔名使用 Title-Case-With-Dashes
- [ ] `.wiki/` 目錄存在；其他檔案未被誤觸（`--only` 模式）

---

## 工作流程總結

```
0. 作者設定 → setup_config.py check
1. 解析參數 → PRIVATE_MODE / REPO_PATH / ONLY / PAGES
2. 粗掃專案 → analyze_project.py（取符號索引）
3. 讀完整檔 → 對每頁必讀的原始碼檔逐檔 Read（不只看 analyzer 摘要）
4. 推導頁面 → 預設集 + CLAUDE.md 一級標題派生
5. 提取參數 → owner / repo / 各頁所需資料
6. 生成 Home → EN + 雙語表格 + 生成標注
7. 生成每頁 → ZH 先寫、EN 翻譯（對齊章節結構）
8. 靜默修正 → 對照 code / config 修正常見錯漏
9. 驗證 → 跑檢查清單；連結 / 對向檔案存在性 + 引用的 symbol 確實存在
10. 儲存 → `.wiki/` 子目錄（自動建立）
```

---

## 範例：Agenvoy 產出（10 主題 + Home）

| 頁 | EN 行 | ZH 行 |
|---|---|---|
| Home.md | 29（雙語樹狀目錄表） | — |
| Getting-Started | 61 | 61 |
| Core-Concepts | 115 | 115 |
| Providers | 71 | 71 |
| Tools | 101 | 101 |
| Memory-System | 63 | 63 |
| Skill-System | 75 | 75 |
| MCP-Integration | 110 | 110 |
| Security-and-Sandbox | 98 | 98 |
| CLI-Reference | 115 | 115 |
| Configuration | 110 | 110 |

平均單頁約 80–100 行；超過 200 行考慮拆分。

---

## 禁止行為

| 禁止項 | 為何 |
|---|---|
| 為每頁加生成標注 | Home 已標；重複是 noise |
| Home 加 ZH 版（`Home.zh.md`） | GitHub Wiki Home 是特殊頁，雙頁造成 sidebar 重複 |
| 主題頁加 Star history / 徽章 | wiki 是文件、不是 landing |
| 寫死頁面集合（不分析 CLAUDE.md） | 與專案脫節 |
| 連結加 `./` prefix | 既與 GitHub Wiki rendering 不一致；sibling 寫法兩處皆通 |
| 翻譯 function / env / API 名稱 | 識別符跨語言一致才能 grep |
| 把 README 內容整段搬進 wiki | 讀者已看過 README；wiki 應深入細節 |
| 跳過靜默修正 | wiki 對齊 code 是核心價值 |
| **僅靠 analyzer JSON 生成內容、未讀完整檔** | analyzer 只抽符號名與 signature，function body 內的邏輯／分支／retry 策略全部漏掉，產出會是「正確但空洞」的 wiki |
| **引用未讀過的 symbol / 檔案路徑** | 幻覺風險最高來源；寫入前必須 grep 確認簽名與行號 |
