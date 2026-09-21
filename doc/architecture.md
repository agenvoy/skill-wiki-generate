# wiki-generate - Architecture

> Back to [README](../README.md)

## Overview

```mermaid
graph TB
    User[User runs /wiki-generate] --> Skill[SKILL.md<br/>Orchestration]
    Skill --> Config[setup_config.py<br/>Author Config]
    Skill --> Analyze[analyze_project.py<br/>Symbol Index]
    Skill --> Read[Full Reads<br/>Source / CLAUDE.md / README]
    Skill --> Research[scripts/seo<br/>Research Protocol and Rules]
    Config --> Author[~/.skill-readme-generate.json]
    Skill --> SiteCfg[wiki-worker/.doc/seo/config.json]
    Analyze --> Derive[Page Set Derivation]
    Read --> Derive
    Derive --> Pages[public/docs/pages<br/>slug.md + slug.zh.md]
    Templates[scripts/templates<br/>build.js / sync-tags.js / docs.css] --> Worker[wiki-worker/]
    Research --> Worker
    Pages --> Build[node build.js]
    Worker --> Build
    Sync[node sync-tags.js<br/>GitHub Releases] --> Build
    Build --> Site[public/*.html / zh / released<br/>sitemap / robots / llms.txt]
    Site --> Verify[analyze_seo.py<br/>Per-Page Verification and Report]
```

## Module: SKILL.md (Orchestration)

Defines arguments, per-step rules, the validation checklist, and prohibitions; script and template paths use `{skill_dir}`, resolved from the actual load location.

```mermaid
graph TB
    subgraph Workflow[SKILL.md Workflow]
        W0[0 Author and site config] --> W1[1 Parse arguments]
        W1 --> W2[2 Symbol index]
        W2 --> W3[3 Full reads]
        W3 --> W4[4 SEO research]
        W4 --> W5[5 Derive pages]
        W5 --> W6[6 Copy templates on first run]
        W6 --> W7[7 Home mirrors README]
        W7 --> W8[8 Topic pages ZH → EN]
        W8 --> W9[9 Silent corrections]
        W9 --> W10[10 Sync releases]
        W10 --> W11[11 Compile]
        W11 --> W12[12 SEO verification]
        W12 --> W13[13 Checklist]
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
        A2 --> B1{config.json complete?}
        B1 -->|Yes| B2[Load and restate]
        B1 -->|No| B3[Ask for missing site / SEO fields]
        B3 --> B4[Verify og_image<br/>read author site JSON-LD]
        B4 --> B5[Write config.json]
    end
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
        C5 -->|No| C7[Derive 6–12 pages]
        C6 --> C8[Home: mirror README verbatim<br/>copy local images to assets/]
        C7 --> C8
        C8 --> C9[Topic pages: ZH first, EN translation<br/>sections and tables aligned]
        C9 --> C10[Silent corrections against code]
    end
```

## Module: Templates and Build (Step 3)

```mermaid
graph TB
    subgraph Scaffold[Step 3.1 Templates]
        S1{build.js exists?} -->|No| S2[Copy five templates<br/>fill site and SEO placeholders]
        S1 -->|Yes| S3{Has PERSON_ID / OG_IMAGE / llms.txt?}
        S3 -->|Yes| S4[Update NAV / DESCRIPTIONS / KEYWORDS only]
        S3 -->|No| S5[Explain gaps, recopy templates with consent]
        S2 --> S6[Overwrite docs.css]
        S4 --> S6
        S5 --> S6
    end
    subgraph Release[Step 3.2 Release History]
        R1[sync-tags.js] --> R2[GitHub Releases API<br/>all pages]
        R2 --> R3[public/docs/tags/*.md<br/>+ manifest.json]
    end
    subgraph Compile[Step 3.3 Compile]
        B1[build.js] --> B2[EN / ZH page HTML]
        B1 --> B3[released/ version pages]
        B1 --> B4[sitemap.xml / robots.txt / llms.txt]
    end
    S6 --> B1
    R3 --> B1
```

## Module: SEO/AEO (Step 8)

```mermaid
graph TB
    subgraph SEO[Step 8]
        E1{--only?} -->|No| E2[Phase A general queries<br/>+ fetch Tier 1 sources]
        E2 --> E3[Phase B keyword queries]
        E3 --> E4[Write research digest<br/>update knowledge_anchors]
        E1 -->|Yes| E5[Reuse latest digest]
        E4 --> E6[Apply R1–R10<br/>title / description / JSON-LD]
        E5 --> E6
        E6 --> E7[analyze_seo.py]
        E7 --> E8[Check h1 / JSON-LD / byline<br/>hreflang / lengths / llms.txt diff]
        E8 --> E9[Write applied report]
    end
```

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Agent as Agent Harness
    participant Skill as SKILL.md
    participant Src as Target Project
    participant Web as Network
    participant Worker as wiki-worker/

    User->>Agent: /wiki-generate [args]
    Agent->>Skill: Load skill definition
    Skill->>Skill: setup_config.py check / config.json
    Skill->>Src: analyze_project.py
    Skill->>Src: Read required files in full
    opt Full run
        Skill->>Web: SEO research Phase A + B
    end
    Skill->>Worker: Copy or update templates
    Skill->>Worker: Write pages/*.md
    opt Full run
        Worker->>Web: sync-tags.js fetches GitHub Releases
    end
    Skill->>Worker: node build.js
    Skill->>Worker: analyze_seo.py
    Skill-->>User: Page list, SEO report, follow-ups
```

## `--only` State Machine

```mermaid
stateDiagram-v2
    [*] --> Parse
    Parse --> Full: No --only
    Parse --> Partial: --only given
    Full --> Research: Run SEO research
    Research --> WriteAll: Write every page
    WriteAll --> SyncTags
    SyncTags --> Compile
    Partial --> WriteSome: Write named pages only, others untouched
    WriteSome --> Compile: Skip research and release sync
    Compile --> Verify: analyze_seo.py
    Verify --> [*]
```
