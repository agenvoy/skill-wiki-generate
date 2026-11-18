# seo.json 契約

適用：`wiki-worker/build.js` 範本 ≥ 7.0.0。`seo.json` 每個欄位都由本 skill 於 Step 8 寫入，`build.js` 讀它輸出 `<head>`、JSON-LD、sitemap、robots.txt、`_headers`、llms.txt；沒有 `seo.json` 時 build 只產出內容頁。

研究、關鍵字與規則來自 `/seo-optimize`，本 skill 只讀不改：

| 來源 | 路徑 |
| --- | --- |
| 關鍵字、`ai_usage`、`one_liner` | `{skill_dir}/../seo-optimize/.doc/{網域}/config.json` |
| 本次修正項 | 同目錄 `plan/`、`applied/` 最新一份中標「交由呼叫方」的項目 |
| 規則 R1–R16 | `{skill_dir}/../seo-optimize/scripts/optimization_rules.md` |

## 套用位置

| 修正項 | 套用位置 |
| --- | --- |
| title、description、keywords、實體、OG、favicon 路徑、`x-default`、AI 使用偏好 | `wiki-worker/seo.json` |
| favicon 圖檔 | `wiki-worker/public/favicon.png`（Step 3.2.2） |
| 舊網址 301、移除網址回 404（R15） | `wiki-worker/redirects.json`（`{"/舊": "/新"}`）、`wiki-worker/removed.json`（`["/移除"]`）；逐網址經使用者同意才寫入 |
| 頁面內容、標題階層（R5，或 R1／R2 判定需補內容） | `pages/*.md`（英中同步） |
| 範本輸出機制本身（新規格、新格式、既有輸出被研究推翻） | `{skill_dir}/scripts/templates/`，依 Step 3.1.1 升 `TEMPLATE_VERSION` 並寫 CHANGELOG，再同步回專案 |
| `public/*.html`、`sitemap.xml`、`robots.txt`、`llms*.txt`、`_headers` | 不直接改：皆為 build 產物；改 `seo.json` 後重跑 `node wiki-worker/build.js` |

## seo.json 欄位

每次 Step 8 都以 `/seo-optimize` 本次的 config、規劃與 `optimization_rules.md` 重新檢查每個欄位；`build.js` 的 `NAV` 每個 slug（EN 與有 `.zh.md` 的 ZH）都要有 description。

```json
{
  "home_title": { "en": "", "zh": "" },
  "descriptions": { "en": { "home": "", "getting-started": "" }, "zh": { "home": "" } },
  "keywords": { "en": { "home": "" }, "zh": { "home": "" } },
  "brand_keywords": [],
  "person": { "id": "", "name": "", "name_zh": "", "alt_names": [], "same_as": [] },
  "organization": { "id": "", "url": "", "name": "", "name_zh": "", "same_as": [] },
  "tagline": "",
  "og_image": "",
  "favicon": "",
  "x_default": "",
  "ai_usage": { "train": "", "input": "", "search": "" },
  "programming_language": "",
  "license_url": ""
}
```

| 欄位 | 規則 | 依據 |
| --- | --- | --- |
| `home_title.en`／`.zh` | 各語言自行撰寫；顯示寬度 ≤ 60；含 config 該語言主要關鍵字且符合首頁內容；格式固定為 `{主題} \| {site_name}`（EN）／`{主題}｜{site_name}`（ZH），`site_name` 是不含 `{owner}/` 的專案名，不用 ` - `、`:` 或前置品牌；人名只在首頁 title 出現一次 | R1 |
| 其他頁 title | 範本組成 `{label} \| {site_name} Docs`／`{label}｜{site_name} 文件`，不在 `seo.json` | 範本 |
| `descriptions` | 每頁一句，描述該頁實際內容；顯示寬度 ≤ 160；全站不重複、不用樣板句；每個陳述都能在該頁找到 | R2 |
| `keywords` | 取自該頁實際出現的主題詞；Google 不採用此 meta，排在規劃「過時參數」段，既有值保留 | A13、R1 |
| `brand_keywords` | 人名、帳號、組織名；build 只補在 keywords meta 尾端，不進 title／description | A8 |
| `person.id`／`name` | 先抓作者網站的 JSON-LD，已宣告 Person 就沿用其 `@id` 與 `name`；沒有則 `@id = {author_url}#person` | R10 |
| `person.name_zh` | 中文頁 JSON-LD Person `name`，只寫中文名（如 `邱敬幃`）；英文頁與中文頁互把對方的名字放進 `alternateName`；無中文名留空 | R10 |
| `person.same_as` | 必含 `~/.skill-readme-generate.json` 的 `same_as` 每一項，不得刪減；組織帳號放 `organization.same_as` | R10 |
| `organization` | 只填實際存在的組織，各語言用正式名稱；`id` 沿用作者網站已宣告的 `@id`；無組織全部留空 | R6 Organization 判準 |
| `tagline` | 署名列與 llms.txt 的定位文字，不產生 schema 實體 | R6 |
| `og_image` | `curl -sIL` 驗證 200 且為 image/*，否則留空並列「需提供 OG 圖」 | R4 |
| `favicon` | `wiki-worker/public/favicon.png`（Step 3.2.2 產生）存在就填 `/favicon.png`，不存在就留空並列待辦「需提供 favicon」 | R14 |
| `x_default` | 預設空字串（語言等權）；只在使用者明確指定時填 `en`／`zh` | SKILL.md 固定預設 |
| `ai_usage` | 取 `{網域}/config.json` 的 `ai_usage`，值為 `y`／`n`／空字串；沒有就詢問一次，不代填 | R13 |
| `programming_language` | 依 `go.mod`／`package.json`／`pyproject.toml` | R6 |
| `license_url` | `LICENSE` 第一行對應的 SPDX 網址；無 LICENSE 留空 | R6 |

`seo.json` 不存在時（新站，或舊範本已由 `migrate_seo_json.js` 搬遷過值）依上表全部產生；已存在時逐欄重驗，不符規則才改。

## 範本依 seo.json 產出的項目

| 項目 | 行為 |
| --- | --- |
| `<head>` | `robots`、title、description、keywords（有值才輸出）、author、canonical、Markdown alternate、`describedby`、icon、hreflang（`en`＋`zh-Hant-TW`，`x_default` 有值才加）、OG、Twitter、JSON-LD；版本頁無 hreflang |
| JSON-LD | `@graph`：Person＋Organization（有 `organization.name` 才有）＋WebSite＋首頁 `SoftwareSourceCode`／其餘 `TechArticle`，含 `datePublished`／`dateModified` |
| 日期 | `stampDates()` 以 Markdown 原文＋meta＋不含日期的 JSON-LD 雜湊；改 `seo.json` 也會更新該頁 `dateModified` 與 sitemap `lastmod` |
| 署名列 | 作者、帳號、組織、tagline、`same_as` 連結、llms.txt 與本頁 Markdown 連結 |
| sitemap／robots.txt／`_headers` | sitemap 只有 `<loc>`＋`<lastmod>`；robots.txt 依 `ai_usage` 輸出 `Content-Usage`／`Content-signal`；`_headers` 給 `.md`／`.txt` 加 `charset=utf-8` |
| llms.txt | 頁面索引（連 Markdown 版）、`## Symbols`、`llms-full.txt`（EN／ZH） |
| IndexNow | 範本 `indexnow.js` 部署後只送 `lastmod` 有變的 URL；首次接進 `deploy` 前徵得使用者同意（R12） |

## 套用後檢查（強制）

`node wiki-worker/build.js` 後逐頁檢查（EN、ZH、版本頁），用 `grep` 與 `python3 -c` 解析 JSON-LD：

| 檢查 | 通過條件 |
| --- | --- |
| build 輸出 | 無 `[Not found] seo.json`、無 `SKIP`、無 `[Conflict]`（已上線頁面消失） |
| 404 | `public/404.html`（有 ZH 時含 `zh/404.html`）存在、含專案介紹與 `noindex`；部署後不存在網址回 404 且為該頁、`redirects.json` 的舊網址回 301 |
| h1 | 每頁恰 1 個 |
| JSON-LD | 可解析，含 Person／WebSite（有組織時含 Organization），首頁為 `SoftwareSourceCode` |
| 日期 | 每個文件頁有 `datePublished`／`dateModified`；h1 後 `.page-date` 的 `<time>`、`dateModified`、sitemap `lastmod` 同值；連續 build 兩次 `public/docs/dates.json` 不變 |
| 實體 | Person `sameAs` 含共用設定 `same_as` 每一項 |
| title／description | 長度在上限內；description 無重複；主題詞與陳述能在該頁 h1 或正文找到（R1、R2） |
| OG／Twitter | 每頁有 `twitter:card`；`og_image` 非空時有 `og:image` |
| favicon | `favicon` 非空時每頁有 `<link rel="icon">`，檔案存在、1:1、≥ 48x48 |
| hreflang／lang | `x_default` 空時無 `x-default`；ZH 頁 `lang="zh-Hant-TW"` |
| llms.txt | URL 集合與實際 `.md` 鏡像（版本單頁除外）差集為空；每頁有 `describedby` 與指向存在 `.md` 的 Markdown alternate；`llms.txt` 有 `## Symbols` |
| 編碼 | 部署後 `curl -sI` 的 `llms.txt`、`llms-full.txt` 與任一 `.md`（含 `/zh/`）`Content-Type` 帶 `charset=utf-8` |
