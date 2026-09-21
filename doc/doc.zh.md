# wiki-generate - 技術文件

> 返回 [README](./README.zh.md)

## 前置需求

- 可載入 `SKILL.md` skill、執行 shell 指令並能搜尋與抓取網頁的 agent harness（SEO 研究需要網路）
- Python 3.10 或更高版本（執行 `setup_config.py`、`analyze_project.py`、`analyze_seo.py`）
- Node.js 與 npm（在目標專案編譯文件站、同步版本紀錄）
- Git；目標專案根目錄必須有 `README.md`
- Cloudflare 帳號（選用，部署時使用）
- `GITHUB_TOKEN`（選用；提高 GitHub API 速率上限，私有 repo 必須設）

## 安裝

`<skills-dir>` 為所用 harness 掃描的 skill 目錄。

### 從 GitHub 複製

```bash
git clone https://github.com/agenvoy/skill-wiki-generate.git \
    <skills-dir>/wiki-generate
```

### 確認安裝

```bash
ls <skills-dir>/wiki-generate/SKILL.md
ls <skills-dir>/wiki-generate/scripts/templates/build.js
```

安裝完成後，於 harness 中以 `/wiki-generate` 呼叫即可。

## 設定

### 作者設定（與 readme-generate 共用）

作者資訊存放於 `~/.skill-readme-generate.json`，已設定過 readme-generate 即可直接沿用；缺失時 agent 會向使用者詢問四個欄位並寫入。

```bash
python3 <skills-dir>/wiki-generate/scripts/setup_config.py check
```

| 欄位 | 用途 |
|------|------|
| `author_name` | 署名列、JSON-LD Person、title 尾端作者名 |
| `author_email` | 聯絡資訊 |
| `author_url` | 署名列連結；Person `@id` 的預設來源 |
| `github_owner` | 預設 `{owner}` 與 `sameAs` |

### 站台與 SEO 設定（每個專案首次生成）

存放於目標專案的 `wiki-worker/.doc/seo/config.json`，缺少的欄位會在首次生成時詢問。

| 欄位 | 用途 | 預設 |
|------|------|------|
| `site_name` | 站名；套件專案一律用 `{owner}/{repo}` | `{owner}/{repo}` |
| `domain` | 正式網域（canonical、sitemap、llms.txt） | 從 `wrangler.toml` 或 repo homepage 推得，推不出就詢問 |
| `gtag_id` | Google Analytics ID | 空字串（不注入） |
| `primary_keywords` / `secondary_keywords` | title／description 關鍵字 | 讀原始碼後提出候選 |
| `author_name_zh` | ZH 頁 title 的作者名 | `author_name` 的中文部分 |
| `person_id` / `person_name` / `person_alt_names` | JSON-LD Person | 沿用作者網站既有 `@id`，否則 `{author_url}#person` |
| `same_as` | Person `sameAs` 與署名列外部連結 | GitHub 個人頁與 `author_url` |
| `org_name` | Organization 節點 | 空字串（不產生） |
| `og_image` | 全站分享圖 | 驗證回應 200 且為圖片才採用，否則留空 |

### 環境變數

| 變數 | 必要 | 說明 |
|------|------|------|
| `GITHUB_TOKEN` | 否 | `sync-tags.js` 帶 `Authorization: Bearer`；匿名上限 60 req/h，私有 repo 必須設 |

## 使用方式

### 基本用法

```bash
/wiki-generate
```

於目標專案根目錄執行：

1. 載入作者設定；首次生成詢問站台與 SEO 設定
2. 以 `analyze_project.py` 取得符號索引，再完整讀取每頁對應的原始碼與 `CLAUDE.md`
3. 依研究協定查證當下 SEO／AEO 做法，寫入 research digest
4. 推導 6–12 頁的頁面集合，首次生成時複製並客製化範本
5. 撰寫 `pages/home.md`（鏡像 README）與各主題頁的英中成對檔
6. 同步 GitHub Releases、編譯 HTML、執行 SEO 驗證並寫出報告

### 首次生成後部署

```bash
cd wiki-worker
npm install
npm run dev
npm run deploy
```

### 只刷新部分頁面

```bash
/wiki-generate --only home,configuration
```

未指定的頁面不讀不寫，不重跑 SEO 研究與版本同步；仍會重新編譯並執行 SEO 驗證。

### 自訂頁面集合

```bash
/wiki-generate --pages getting-started,api-reference,faq
```

### 覆蓋儲存庫路徑

```bash
/wiki-generate github.com/foo/bar
```

### 手動操作目標專案的文件站

```bash
cd wiki-worker
node sync-tags.js
node build.js
python3 <skills-dir>/wiki-generate/scripts/seo/analyze_seo.py .
```

`build.js` 每行輸出 `OK: ...`；出現 `SKIP: <slug>.md not found` 代表 NAV 宣告的頁面缺少 md 檔。

## 設定參考

### 指令參數

| 參數 | 格式 | 說明 |
|------|------|------|
| `REPO_PATH` | `github.com/{owner}/{repo}` | 覆蓋預設 owner／repo |
| `--only <pages>` | 逗號分隔 slug | 僅重生成指定頁 |
| `--pages <list>` | 逗號分隔 slug | 覆蓋自動推導的頁面集合 |

參數順序無關。

### 預設頁面集

| 頁 | slug | 觸發條件 |
|----|------|----------|
| Home | `home` | 永遠（鏡像 `README.md`） |
| Getting Started | `getting-started` | 永遠 |
| Architecture | `architecture` | 有 `doc/architecture.md` 或 `CLAUDE.md` 描述模組關係；只放一張概覽圖 |
| Core Concepts | `core-concepts` | 非 trivial 專案 |
| Configuration | `configuration` | 有 `.env.example` 或多處讀取環境變數 |
| CLI Reference | `cli-reference` | 有指令派發或可執行的 make target |
| API Reference | `api-reference` | 函式庫專案 |

`CLAUDE.md` 中 50 行以上的子系統段落另外推導為專屬頁面。slug 一律 lowercase-kebab-case，ZH 版加 `.zh` 中綴。

### 輸出結構

| 路徑 | 來源 | 可手動編輯 |
|------|------|------------|
| `wiki-worker/public/docs/pages/*.md` | skill 生成 | 是（唯一來源） |
| `wiki-worker/public/docs/tags/*.md`、`manifest.json` | `sync-tags.js` | 否 |
| `wiki-worker/public/*.html`、`zh/*.html`、`released/*.html` | `build.js` | 否 |
| `wiki-worker/public/sitemap.xml`、`robots.txt`、`llms.txt` | `build.js` | 否 |
| `wiki-worker/public/docs.css` | 每次生成從範本整檔覆蓋 | 否 |
| `wiki-worker/build.js`、`sync-tags.js`、`package.json`、`wrangler.toml` | 首次生成從範本複製 | 之後只更新 NAV 等頁面資料 |
| `wiki-worker/.doc/seo/` | 設定、研究 digest、套用報告 | — |

### npm 指令（`wiki-worker/package.json`）

| 指令 | 行為 |
|------|------|
| `npm run build` | `node build.js` |
| `npm run sync-tags` | `node sync-tags.js` |
| `npm run dev` | 編譯後 `wrangler dev` |
| `npm run deploy` | 編譯後 `wrangler deploy` |

### SEO／AEO 規則對應

| 規則 | 產出 |
|------|------|
| R1 Title | 首頁 title 含產品關鍵字；EN ≤ 60 字元、ZH ≤ 30 字 |
| R2 Description | 每頁一句實際內容，EN ≤ 160 字元、ZH ≤ 80 字，禁止樣板句 |
| R3 canonical／hreflang | `en` 與 `zh-Hant-TW` 兩條 alternate，不輸出 `x-default` |
| R4 OG／Twitter | 首頁 `website`、其餘 `article`；無 `og_image` 不輸出圖片 meta |
| R5 標題階層 | 每頁恰一個 h1 |
| R6 JSON-LD | Person、WebSite、選用 Organization；首頁 `SoftwareSourceCode`、其餘 `TechArticle` |
| R7 robots／sitemap／llms.txt | 不封鎖檢索型 bot；sitemap 含全部頁面；llms.txt URL 與實際頁面一致 |
| R8／R9 | 套件登錄頁與 repo metadata 只寫入報告，不執行 |
| R10 實體一致性 | 署名列、JSON-LD、llms.txt 的作者與組織寫法一致 |

### SEO 相關檔案

| 檔案 | 用途 |
|------|------|
| `scripts/seo/research_protocol.md` | 研究查詢集、來源分級與 digest 格式 |
| `scripts/seo/knowledge_anchors.md` | 已驗證的一手立場快照，研究後就地更新 |
| `scripts/seo/optimization_rules.md` | R1–R10 判準、動作與禁止事項 |
| `scripts/seo/output_format.md` | 套用報告格式 |
| `scripts/seo/analyze_seo.py` | 編譯後逐頁盤點 title、description、h1、OG、JSON-LD、hreflang 與 crawler 指令 |
