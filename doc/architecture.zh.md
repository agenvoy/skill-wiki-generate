# wiki-generate - 架構

> 返回 [README](./README.zh.md)

## 概覽

```mermaid
graph TB
    User[使用者呼叫 /wiki-generate] --> Skill[SKILL.md<br/>流程協調]
    Skill --> Config[setup_config.py<br/>作者設定]
    Config --> Author[~/.skill-readme-generate.json]
    Skill --> SiteCfg[wiki-worker/.doc/seo/config.json<br/>站台設定]
    Skill --> Coverage[check_coverage.py<br/>覆蓋率與移除紀錄]
    Skill --> Analyze[analyze_project.py<br/>符號索引]
    Skill --> Read[完整讀取<br/>原始碼 / CLAUDE.md / README]
    Coverage --> Derive[推導頁面集合]
    Analyze --> Derive
    Read --> Derive
    Derive --> Pages[public/docs/pages<br/>slug.md + slug.zh.md]
    Templates[scripts/templates<br/>build.js / sync-tags.js / indexnow.js / docs.css / demo.js] --> Worker[wiki-worker/]
    Pages --> Build[node build.js]
    Worker --> Build
    Sync[node sync-tags.js<br/>GitHub Releases] --> Build
    Build --> Site[public/*.html / zh / released<br/>sitemap / robots / llms.txt]
    Site --> SEO["/seo-optimize<br/>研究與優化"]
    SEO -->|改來源後重新編譯| Build
    Site --> Check[Step 8.5<br/>逐頁輸出檢查]
```

## Module: SKILL.md（流程協調）

定義參數、各步驟規則、驗證清單與禁止行為；腳本與範本路徑以 `{skill_dir}` 表示，依實際載入位置代入。

```mermaid
graph TB
    subgraph Workflow[SKILL.md 工作流程]
        W0[0 作者與站台設定] --> W05[0.5 覆蓋率檢查]
        W05 --> W1[1 解析參數]
        W1 --> W2[2 符號索引]
        W2 --> W3[3 完整讀檔]
        W3 --> W4[4 推導頁面]
        W4 --> W5[5 複製或對齊範本]
        W5 --> W6[6 Home 鏡像 README]
        W6 --> W7[7 主題頁 ZH → EN]
        W7 --> W8[8 靜默修正]
        W8 --> W9[9 同步版本]
        W9 --> W10[10 編譯]
        W10 --> W11[11 SEO：/seo-optimize 或基本規則]
        W11 --> W12[12 檢查清單]
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
        A2 --> B1{站台 config.json 完整?}
        B1 -->|是| B2[載入並複述]
        B1 -->|否| B3[詢問缺少的站台欄位]
        B3 --> B4[驗證 og_image／favicon<br/>讀取作者網站 JSON-LD]
        B4 --> B5[寫入 config.json]
    end
```

## Module: 覆蓋率（Step 1.4）

```mermaid
graph TB
    subgraph Coverage[check_coverage.py]
        V1[git fetch --tags] --> V2{go.mod?}
        V2 -->|是| V3[go doc -all<br/>公開符號]
        V2 -->|否| V4[analyze_project.py<br/>公開符號]
        V3 --> V5[比對 pages/*.md]
        V4 --> V5
        V5 --> V6[missing<br/>程式碼有、文件沒寫]
        V5 --> V7[removed<br/>文件有、程式碼沒有 + removed_in]
        V3 --> V8[沿 tag 逐版比對<br/>undocumented_removals]
        V5 --> V9[--write-symbols<br/>symbols.json]
    end
    V6 --> Fix[補功能說明到主題頁]
    V7 --> Removed[移到已移除 API 頁<br/>標 Removed in／移除於]
    V8 --> Removed
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
        C5 -->|否| C7[自動推導<br/>一頁一主題，過長拆子頁]
        C6 --> C8[Home：逐字鏡像 README<br/>本地圖片複製至 assets/]
        C7 --> C8
        C8 --> C9[主題頁：ZH 先寫、EN 翻譯<br/>前端套件寫 demo fence 並實跑]
        C9 --> C10[對照 code 靜默修正]
    end
```

## Module: 範本與編譯（Step 3）

```mermaid
graph TB
    subgraph Scaffold[Step 3.1 範本]
        S1{build.js 存在?} -->|否| S2[複製範本<br/>替換站台 placeholder]
        S1 -->|是| S3{TEMPLATE_VERSION 相同?}
        S3 -->|是| S4[只更新 NAV / DESCRIPTIONS / KEYWORDS]
        S3 -->|否| S5[重新複製範本<br/>放回頁面資料，依 CHANGELOG 修正]
        S2 --> S6[docs.css／demo.js 整檔覆蓋]
        S4 --> S6
        S5 --> S6
    end
    subgraph Release[Step 3.2 版本紀錄]
        R1[sync-tags.js] --> R2[GitHub Releases API<br/>分頁取完]
        R2 --> R3[public/docs/tags/*.md<br/>+ manifest.json]
    end
    subgraph Compile[Step 3.3 編譯]
        B1[build.js] --> B2[EN / ZH 頁面 HTML<br/>+ 每頁 Markdown 版]
        B1 --> B3[released/ 版本頁]
        B1 --> B4[sitemap / robots / _headers<br/>llms.txt / llms-full.txt]
        B1 --> B5[dates.json<br/>內容雜湊決定日期]
    end
    S6 --> B1
    R3 --> B1
```

## Module: SEO／AEO（Step 8）

```mermaid
graph TB
    subgraph SEO[Step 8]
        E0{--only?} -->|是| E5[8.3 基本規則填值]
        E0 -->|否| E1{seo-optimize 已安裝?}
        E1 -->|是| E2["8.2 /seo-optimize project_root"]
        E1 -->|否| E3{下載?}
        E3 -->|同意| E4[git clone] --> E2
        E3 -->|否決或失敗| E5
        E2 --> E6[套用到 pages/*.md<br/>build.js 常數 / scripts/templates]
        E6 --> E7[重新編譯]
        E5 --> E7
        E7 --> E8[8.5 逐頁檢查<br/>h1 / JSON-LD / 日期 / byline<br/>hreflang / 長度 / llms.txt]
    end
```

## 資料流

```mermaid
sequenceDiagram
    participant User as 使用者
    participant Agent as Agent Harness
    participant Skill as SKILL.md
    participant Src as 目標專案
    participant Worker as wiki-worker/
    participant SEO as /seo-optimize

    User->>Agent: /wiki-generate [args]
    Agent->>Skill: 載入 skill 定義
    Skill->>Skill: setup_config.py check / config.json
    Skill->>Src: check_coverage.py
    Skill->>Src: analyze_project.py
    Skill->>Src: 完整讀取每頁必讀檔
    Skill->>Worker: 複製或對齊範本
    Skill->>Worker: 寫入 pages/*.md
    opt 完整生成
        Worker->>Worker: sync-tags.js 抓 GitHub Releases
    end
    Skill->>Worker: node build.js
    opt 完整生成且已安裝
        Skill->>SEO: /seo-optimize project_root
        SEO->>Worker: 修改來源檔
        Skill->>Worker: node build.js
    end
    Skill->>Worker: 逐頁輸出檢查
    Skill-->>User: 頁面清單、覆蓋率結果、待辦
```

## `--only` 狀態機

```mermaid
stateDiagram-v2
    [*] --> Parse
    Parse --> Full: 無 --only
    Parse --> Partial: 有 --only
    Full --> WriteAll: 寫入全部頁面
    WriteAll --> SyncTags
    SyncTags --> Compile
    Compile --> SeoOptimize: 完整生成
    SeoOptimize --> Recompile
    Recompile --> Verify
    Partial --> WriteSome: 只寫指定頁，其他不讀不寫
    WriteSome --> CompilePartial: 跳過版本同步與 /seo-optimize
    CompilePartial --> Verify: 基本規則填值
    Verify --> [*]
```
