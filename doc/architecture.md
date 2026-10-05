# wiki-generate - Architecture

> Back to [README](../README.md)

## Overview

```mermaid
graph TB
    User[User calls /wiki-generate] --> Skill[SKILL.md<br/>Orchestration]
    Skill --> Config[setup_config.py<br/>Author Config]
    Config --> Author[~/.skill-readme-generate.json]
    Skill --> SiteCfg[wiki-worker/.doc/seo/config.json<br/>Site Config]
    Skill --> Coverage[check_coverage.py<br/>Coverage and Removals]
    Skill --> Analyze[analyze_project.py<br/>Symbol Index]
    Skill --> Read[Full Reads<br/>Source / CLAUDE.md / README]
    Coverage --> Derive[Derive Page Set]
    Analyze --> Derive
    Read --> Derive
    Derive --> Pages[public/docs/pages<br/>slug.md + slug.zh.md]
    Templates[scripts/templates<br/>build.js / sync-tags.js / indexnow.js / docs.css / demo.js] --> Worker[wiki-worker/]
    Pages --> Build[node build.js]
    Worker --> Build
    Sync[node sync-tags.js<br/>GitHub Releases] --> Build
    Build --> Site[public/*.html / zh / released<br/>sitemap / robots / llms.txt]
    Site --> SEO["/seo-optimize<br/>Research and Optimization"]
    SEO -->|Edit sources, recompile| Build
    Site --> Check[Step 8.5<br/>Per-Page Output Check]
```

## Module: SKILL.md (Orchestration)

Defines arguments, per-step rules, the verification checklist, and prohibitions; script and template paths use `{skill_dir}`, resolved to the actual load location.

```mermaid
graph TB
    subgraph Workflow[SKILL.md Workflow]
        W0[0 Author and site config] --> W05[0.5 Coverage check]
        W05 --> W1[1 Parse arguments]
        W1 --> W2[2 Symbol index]
        W2 --> W3[3 Full file reads]
        W3 --> W4[4 Derive pages]
        W4 --> W5[5 Copy or realign templates]
        W5 --> W6[6 Home mirrors README]
        W6 --> W7[7 Topic pages ZH → EN]
        W7 --> W8[8 Silent corrections]
        W8 --> W9[9 Sync releases]
        W9 --> W10[10 Compile]
        W10 --> W11[11 SEO: /seo-optimize or basic rules]
        W11 --> W12[12 Checklist]
    end
```

## Module: Configuration (Step 0)

```mermaid
graph TB
    subgraph Setup[Step 0]
        A1[setup_config.py check] -->|exit 0| A2[Load author config]
        A1 -->|exit 1| A3[Ask for four fields]
        A3 --> A4[setup_config.py write]
        A4 --> A2
        A2 --> B1{Site config.json complete?}
        B1 -->|Yes| B2[Load and restate]
        B1 -->|No| B3[Ask for missing site fields]
        B3 --> B4[Verify og_image / favicon<br/>read author site JSON-LD]
        B4 --> B5[Write config.json]
    end
```

## Module: Coverage (Step 1.4)

```mermaid
graph TB
    subgraph Coverage[check_coverage.py]
        V1[git fetch --tags] --> V2{go.mod?}
        V2 -->|Yes| V3[go doc -all<br/>Public symbols]
        V2 -->|No| V4[analyze_project.py<br/>Public symbols]
        V3 --> V5[Compare with pages/*.md]
        V4 --> V5
        V5 --> V6[missing<br/>In code, not in docs]
        V5 --> V7[removed<br/>In docs, not in code + removed_in]
        V3 --> V8[Walk tags version by version<br/>undocumented_removals]
        V5 --> V9[--write-symbols<br/>symbols.json]
    end
    V6 --> Fix[Document behavior on topic pages]
    V7 --> Removed[Move to Removed API page<br/>mark Removed in / 移除於]
    V8 --> Removed
```

## Module: Content Generation (Steps 1, 2, 4, 5)

```mermaid
graph TB
    subgraph Content[Content Generation]
        C1[analyze_project.py] --> C2[Pick required files per page]
        C2 --> C3[Read source in full<br/>CLAUDE.md / doc / .env.example]
        C3 --> C4[Default page set<br/>+ CLAUDE.md subsystem sections]
        C4 --> C5{--pages?}
        C5 -->|Yes| C6[Use the given page set]
        C5 -->|No| C7[Derive automatically<br/>one topic per page, split long pages]
        C6 --> C8[Home: verbatim README mirror<br/>local images copied to assets/]
        C7 --> C8
        C8 --> C9[Topic pages: ZH first, EN translation<br/>frontend packages get demo fences, run live]
        C9 --> C10[Silent corrections against code]
    end
```

## Module: Templates and Compilation (Step 3)

```mermaid
graph TB
    subgraph Scaffold[Step 3.1 Templates]
        S1{build.js exists?} -->|No| S2[Copy templates<br/>fill site placeholders]
        S1 -->|Yes| S3{Same TEMPLATE_VERSION?}
        S3 -->|Yes| S4[Update NAV / DESCRIPTIONS / KEYWORDS only]
        S3 -->|No| S5[Copy templates again<br/>restore page data, apply CHANGELOG fixes]
        S2 --> S6[Overwrite docs.css / demo.js]
        S4 --> S6
        S5 --> S6
    end
    subgraph Release[Step 3.2 Release History]
        R1[sync-tags.js] --> R2[GitHub Releases API<br/>all pages]
        R2 --> R3[public/docs/tags/*.md<br/>+ manifest.json]
    end
    subgraph Compile[Step 3.3 Compile]
        B1[build.js] --> B2[EN / ZH page HTML<br/>+ per-page Markdown]
        B1 --> B3[released/ version pages]
        B1 --> B4[sitemap / robots / _headers<br/>llms.txt / llms-full.txt]
        B1 --> B5[dates.json<br/>content-hash dates]
    end
    S6 --> B1
    R3 --> B1
```

## Module: SEO/AEO (Step 8)

```mermaid
graph TB
    subgraph SEO[Step 8]
        E0{--only?} -->|Yes| E5[8.3 Basic-rule values]
        E0 -->|No| E1{seo-optimize installed?}
        E1 -->|Yes| E2["8.2 /seo-optimize project_root"]
        E1 -->|No| E3{Download?}
        E3 -->|Accept| E4[git clone] --> E2
        E3 -->|Decline or fail| E5
        E2 --> E6[Apply to pages/*.md<br/>build.js constants / scripts/templates]
        E6 --> E7[Recompile]
        E5 --> E7
        E7 --> E8[8.5 Per-page check<br/>h1 / JSON-LD / dates / byline<br/>hreflang / length / llms.txt]
    end
```

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Agent as Agent Harness
    participant Skill as SKILL.md
    participant Src as Target Project
    participant Worker as wiki-worker/
    participant SEO as /seo-optimize

    User->>Agent: /wiki-generate [args]
    Agent->>Skill: Load skill definition
    Skill->>Skill: setup_config.py check / config.json
    Skill->>Src: check_coverage.py
    Skill->>Src: analyze_project.py
    Skill->>Src: Read required files in full
    Skill->>Worker: Copy or realign templates
    Skill->>Worker: Write pages/*.md
    opt Full run
        Worker->>Worker: sync-tags.js fetches GitHub Releases
    end
    Skill->>Worker: node build.js
    opt Full run and installed
        Skill->>SEO: /seo-optimize project_root
        SEO->>Worker: Edit source files
        Skill->>Worker: node build.js
    end
    Skill->>Worker: Per-page output check
    Skill-->>User: Page list, coverage result, follow-ups
```

## `--only` State Machine

```mermaid
stateDiagram-v2
    [*] --> Parse
    Parse --> Full: No --only
    Parse --> Partial: With --only
    Full --> WriteAll: Write every page
    WriteAll --> SyncTags
    SyncTags --> Compile
    Compile --> SeoOptimize: Full run
    SeoOptimize --> Recompile
    Recompile --> Verify
    Partial --> WriteSome: Write selected pages, skip the rest
    WriteSome --> CompilePartial: Skip release sync and /seo-optimize
    CompilePartial --> Verify: Basic-rule values
    Verify --> [*]
```
