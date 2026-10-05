# wiki-generate - 技術文件

> 返回 [README](./README.zh.md)

## 前置需求

- 可載入 `SKILL.md` skill 並執行 shell 指令的 agent harness
- Python 3.10 或更高版本（執行 `setup_config.py`、`analyze_project.py`、`check_coverage.py`）
- Node.js 與 npm（在目標專案編譯文件站、同步版本紀錄、送出 IndexNow）
- Git；目標專案根目錄必須有 `README.md`
- Go 工具鏈（目標為 Go 專案時，`check_coverage.py` 以 `go doc -all` 取得公開符號）
- `seo-optimize` skill（選用；未安裝時會詢問是否下載，否決則以基本規則完成 SEO 填值）
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
| `github_owner` | 預設 `{owner}` 與署名列作者帳號 |
| `same_as` | Person `sameAs` 必含清單，每個站台全數放入 |

### 站台設定（每個專案首次生成）

存放於目標專案的 `wiki-worker/.doc/seo/config.json`，缺少的欄位會在首次生成時詢問。關鍵字、AI 使用偏好等 SEO 設定由 `/seo-optimize` 管理於 `<project_root>/.doc/seo-optimize/config.json`，本 skill 不詢問。

| 欄位 | 用途 | 預設 |
|------|------|------|
| `site_name` | 站名；套件專案一律用 `{owner}/{repo}` | `{owner}/{repo}` |
| `domain` | 正式網域（canonical、sitemap、llms.txt） | 從 `wrangler.toml` 或 repo homepage 推得，推不出就詢問 |
| `gtag_id` | Google Analytics ID | 空字串（不注入） |
| `author_name_zh` | ZH 頁 title 的作者名 | `author_name` 的中文部分 |
| `person_id` / `person_name` / `person_alt_names` | JSON-LD Person | 沿用作者網站既有 `@id`，否則 `{author_url}#person` |
| `same_as` | Person `sameAs` 與署名列外部連結 | 共用設定的 `same_as` 全數放入 |
| `org_name` / `org_name_zh` / `org_same_as` | Organization 節點，EN／ZH 各用自身語言名稱 | 空字串（不產生） |
| `tagline` | 署名列與 llms.txt 的定位文字，不產生 schema 實體 | 空字串（不輸出） |
| `favicon` | 全站 favicon（`public/favicon.png`） | 找不到可驗證的 1:1 圖就留空 |
| `og_image` | 全站分享圖 | 驗證回應 200 且為圖片才採用，否則留空 |
| `brand_keywords` | 每頁 keywords 尾端補上的品牌詞 | 空陣列 |
| `x_default` | hreflang `x-default` 指向的語言 | 空字串（不輸出），只在使用者指定時填值 |

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

1. 載入作者設定；首次生成詢問站台設定
2. 執行 `check_coverage.py`，找出文件缺漏與已移除的公開符號
3. 以 `analyze_project.py` 取得符號索引，再完整讀取每頁對應的原始碼與 `CLAUDE.md`
4. 推導頁面集合（一頁一個主題，頁數不設上限），首次生成時複製並客製化範本
5. 撰寫 `pages/home.md`（鏡像 README）與各主題頁的英中成對檔
6. 同步 GitHub Releases 並編譯 HTML
7. 呼叫 `/seo-optimize` 研究並優化，重新編譯後逐頁檢查範本輸出

### 首次生成後部署

```bash
cd wiki-worker
npm install
npm run dev
npm run deploy
```

`npm run deploy` 會在部署前產生 IndexNow key 檔，部署後只送出內容有變動的 URL。

### 只刷新部分頁面

```bash
/wiki-generate --only home,configuration
```

未指定的頁面不讀不寫，不呼叫 `/seo-optimize`、不同步版本；重生的頁面以基本規則填值，仍會重新編譯並檢查輸出。

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
python3 <skills-dir>/wiki-generate/scripts/check_coverage.py . \
    --write-symbols wiki-worker/public/docs/symbols.json
cd wiki-worker
node sync-tags.js
node build.js
```

`check_coverage.py` 有缺漏時 exit 1 並輸出 `missing`／`removed`／`undocumented_removals`。`build.js` 每行輸出 `OK: ...`；出現 `SKIP: <slug>.md not found` 代表 NAV 宣告的頁面缺少 md 檔。

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

`CLAUDE.md` 中 50 行以上的子系統段落另外推導為專屬頁面。開場一句話講不完、`##` 超過 4 個或英文原始檔超過約 6 KB 的頁面拆成子頁。slug 一律 lowercase-kebab-case，ZH 版加 `.zh` 中綴。

### API 覆蓋率（`check_coverage.py`）

| 輸出欄位 | 意義 |
|----------|------|
| `missing` | 程式碼有、文件沒寫的公開符號 |
| `removed` | 文件提到、程式碼已不存在的識別字，附 `removed_in` |
| `undocumented_removals` | 沿 tag 比對出的歷史移除符號，文件尚無移除紀錄（僅 Go） |

Go 專案以 `go doc -all` 取得符號，其他語言改用 `analyze_project.py`。移除紀錄以 `Removed in`／`移除於` 標記，腳本以這兩個關鍵字辨識。

### 輸出結構

| 路徑 | 來源 | 可手動編輯 |
|------|------|------------|
| `wiki-worker/public/docs/pages/*.md` | skill 生成 | 是（唯一來源） |
| `wiki-worker/public/docs/tags/*.md`、`manifest.json` | `sync-tags.js` | 否 |
| `wiki-worker/public/docs/symbols.json` | `check_coverage.py --write-symbols` | 否 |
| `wiki-worker/public/docs/dates.json` | `build.js`（每頁內容雜湊與日期） | 否，刪除會重置所有日期 |
| `wiki-worker/public/*.html`、`zh/*.html`、`released/*.html` | `build.js` | 否 |
| `wiki-worker/public/sitemap.xml`、`robots.txt`、`_headers`、`llms.txt`、`llms-full.txt` | `build.js` | 否 |
| `wiki-worker/public/docs.css`、`demo.js` | 每次生成從範本整檔覆蓋（`demo.js` 僅前端套件） | 否 |
| `wiki-worker/build.js`、`sync-tags.js`、`indexnow.js`、`package.json`、`wrangler.toml` | 從範本複製 | 之後只更新 NAV 等頁面資料；範本版號落後時整份對齊 |
| `wiki-worker/.doc/seo/config.json` | 站台設定 | — |

### npm 指令（`wiki-worker/package.json`）

| 指令 | 行為 |
|------|------|
| `npm run build` | `node build.js` |
| `npm run sync-tags` | `node sync-tags.js` |
| `npm run dev` | 編譯後 `wrangler dev` |
| `npm run deploy` | 編譯、產生 IndexNow key、`wrangler deploy`，再送出有變動的 URL |

### 範本版號

`scripts/templates/build.js` 的 `TEMPLATE_VERSION` 是判斷專案是否落後的依據：專案版號較低或缺少版號時，重新複製範本並放回既有頁面資料；`scripts/templates/CHANGELOG.md` 只記錄需要專案端處理的破壞性變更。

### SEO／AEO

| 狀態 | 行為 |
|------|------|
| 已安裝 `seo-optimize` | 編譯後執行 `/seo-optimize <project_root>`；套用只改 `pages/*.md`、`build.js` 常數或 `scripts/templates/`，不改編譯產物，之後重新編譯 |
| 未安裝 | 詢問是否從 `https://github.com/agenvoy/skill-seo-optimize` 下載 |
| 否決下載或 `--only` | 依基本規則填首頁 title、每頁 description 與 keywords |

| 項目 | 基本規則 |
|------|----------|
| 首頁 title | 含產品關鍵字；EN ≤ 60 字元、ZH ≤ 30 字；作者名只出現一次 |
| description | 每頁一句實際內容；EN ≤ 160 字元、ZH ≤ 80 字；全站不重複、不用樣板句 |
| 品牌詞 | 只放署名列、JSON-LD、首頁 description、llms.txt |
| AI 使用偏好 | 取 `/seo-optimize` config 的 `ai_usage`，沒有則詢問使用者，不代填 |

範本內建輸出：canonical 與 `en`／`zh-Hant-TW` hreflang、OG／Twitter、每頁恰一個 h1、JSON-LD（Person、WebSite、選用 Organization；首頁 `SoftwareSourceCode`、其餘 `TechArticle`）、內容雜湊決定的日期、robots.txt、sitemap、llms.txt 與每頁 Markdown 版、可見署名列。
