# wiki-generate - 架構

> 返回 [README](./README.zh.md)

## 概覽

```mermaid
graph TB
    User[使用者呼叫 /wiki-generate] --> Skill[SKILL.md<br/>流程協調]
    Skill --> Config[setup_config.py<br/>作者設定]
    Skill --> Analyze[analyze_project.py<br/>符號索引]
    Skill --> Read[完整讀取<br/>原始碼 / CLAUDE.md / README]
    Skill --> Research[scripts/seo<br/>研究協定與規則]
    Config --> Author[~/.skill-readme-generate.json]
    Skill --> SiteCfg[wiki-worker/.doc/seo/config.json]
    Analyze --> Derive[推導頁面集合]
    Read --> Derive
    Derive --> Pages[public/docs/pages<br/>slug.md + slug.zh.md]
    Templates[scripts/templates<br/>build.js / sync-tags.js / docs.css] --> Worker[wiki-worker/]
    Research --> Worker
    Pages --> Build[node build.js]
    Worker --> Build
    Sync[node sync-tags.js<br/>GitHub Releases] --> Build
    Build --> Site[public/*.html / zh / released<br/>sitemap / robots / llms.txt]
    Site --> Verify[analyze_seo.py<br/>逐頁驗證與報告]
```

## Module: SKILL.md（流程協調）

定義參數、各步驟規則、驗證清單與禁止行為；腳本與範本路徑以 `{skill_dir}` 表示，依實際載入位置代入。

```mermaid
graph TB
    subgraph Workflow[SKILL.md 工作流程]
        W0[0 作者與站台設定] --> W1[1 解析參數]
        W1 --> W2[2 符號索引]
        W2 --> W3[3 完整讀檔]
        W3 --> W4[4 SEO 研究]
        W4 --> W5[5 推導頁面]
        W5 --> W6[6 首次生成複製範本]
        W6 --> W7[7 Home 鏡像 README]
        W7 --> W8[8 主題頁 ZH → EN]
        W8 --> W9[9 靜默修正]
        W9 --> W10[10 同步版本]
        W10 --> W11[11 編譯]
        W11 --> W12[12 SEO 驗證]
        W12 --> W13[13 檢查清單]
    end
```

## Module: 設定（Step 0）

```mermaid
graph TB
    subgraph Setup[Step 0]
        A1[setup_config.py check] -->|exit 0| A2[載入作者設定]
        A1 -->|exit 1| A3[詢問四欄位]
        A3 --> A4[setup_config.py write]
        A4 --> A2
        A2 --> B1{config.json 完整?}
        B1 -->|是| B2[載入並複述]
        B1 -->|否| B3[詢問缺少的站台／SEO 欄位]
        B3 --> B4[驗證 og_image<br/>讀取作者網站 JSON-LD]
        B4 --> B5[寫入 config.json]
    end
```

## Module: 內容生成（Step 1、2、4、5）

```mermaid
graph TB
    subgraph Content[內容生成]
        C1[analyze_project.py] --> C2[決定每頁必讀檔]
        C2 --> C3[完整讀取原始碼<br/>CLAUDE.md / doc / .env.example]
        C3 --> C4[預設頁面集<br/>+ CLAUDE.md 子系統段落]
        C4 --> C5{--pages?}
        C5 -->|是| C6[使用指定頁面集]
        C5 -->|否| C7[自動推導 6–12 頁]
        C6 --> C8[Home：逐字鏡像 README<br/>本地圖片複製至 assets/]
        C7 --> C8
        C8 --> C9[主題頁：ZH 先寫、EN 翻譯<br/>章節與表格對齊]
        C9 --> C10[對照 code 靜默修正]
    end
```

## Module: 範本與編譯（Step 3）

```mermaid
graph TB
    subgraph Scaffold[Step 3.1 範本]
        S1{build.js 存在?} -->|否| S2[複製五個範本<br/>替換站台與 SEO placeholder]
        S1 -->|是| S3{含 PERSON_ID / OG_IMAGE / llms.txt?}
        S3 -->|是| S4[只更新 NAV / DESCRIPTIONS / KEYWORDS]
        S3 -->|否| S5[說明缺漏，同意後重新複製範本]
        S2 --> S6[docs.css 整檔覆蓋]
        S4 --> S6
        S5 --> S6
    end
    subgraph Release[Step 3.2 版本紀錄]
        R1[sync-tags.js] --> R2[GitHub Releases API<br/>分頁取完]
        R2 --> R3[public/docs/tags/*.md<br/>+ manifest.json]
    end
    subgraph Compile[Step 3.3 編譯]
        B1[build.js] --> B2[EN / ZH 頁面 HTML]
        B1 --> B3[released/ 版本頁]
        B1 --> B4[sitemap.xml / robots.txt / llms.txt]
    end
    S6 --> B1
    R3 --> B1
```

## Module: SEO／AEO（Step 8）

```mermaid
graph TB
    subgraph SEO[Step 8]
        E1{--only?} -->|否| E2[Phase A 通用查詢<br/>+ 抓取 Tier 1 來源]
        E2 --> E3[Phase B 關鍵字查詢]
        E3 --> E4[寫入 research digest<br/>更新 knowledge_anchors]
        E1 -->|是| E5[沿用最新 digest]
        E4 --> E6[套用 R1–R10<br/>title / description / JSON-LD]
        E5 --> E6
        E6 --> E7[analyze_seo.py]
        E7 --> E8[逐頁檢查 h1 / JSON-LD / byline<br/>hreflang / 長度 / llms.txt 差集]
        E8 --> E9[寫入 applied 報告]
    end
```

## 資料流

```mermaid
sequenceDiagram
    participant User as 使用者
    participant Agent as Agent Harness
    participant Skill as SKILL.md
    participant Src as 目標專案
    participant Web as 網路
    participant Worker as wiki-worker/

    User->>Agent: /wiki-generate [args]
    Agent->>Skill: 載入 skill 定義
    Skill->>Skill: setup_config.py check / config.json
    Skill->>Src: analyze_project.py
    Skill->>Src: 完整讀取每頁必讀檔
    opt 完整生成
        Skill->>Web: SEO 研究 Phase A＋B
    end
    Skill->>Worker: 複製或更新範本
    Skill->>Worker: 寫入 pages/*.md
    opt 完整生成
        Worker->>Web: sync-tags.js 抓 GitHub Releases
    end
    Skill->>Worker: node build.js
    Skill->>Worker: analyze_seo.py
    Skill-->>User: 頁面清單、SEO 報告、待辦
```

## `--only` 狀態機

```mermaid
stateDiagram-v2
    [*] --> Parse
    Parse --> Full: 無 --only
    Parse --> Partial: 有 --only
    Full --> Research: 跑 SEO 研究
    Research --> WriteAll: 寫入全部頁面
    WriteAll --> SyncTags
    SyncTags --> Compile
    Partial --> WriteSome: 只寫指定頁，其他不讀不寫
    WriteSome --> Compile: 跳過研究與版本同步
    Compile --> Verify: analyze_seo.py
    Verify --> [*]
```
