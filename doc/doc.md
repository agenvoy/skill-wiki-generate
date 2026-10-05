# wiki-generate - Documentation

> Back to [README](../README.md)

## Prerequisites

- An agent harness that loads `SKILL.md` skills and runs shell commands
- Python 3.10 or higher (runs `setup_config.py`, `analyze_project.py`, `check_coverage.py`)
- Node.js and npm (compile the docs site, sync release history, and submit IndexNow in the target project)
- Git; the target project root must contain `README.md`
- Go toolchain (for Go targets, `check_coverage.py` reads public symbols through `go doc -all`)
- The `seo-optimize` skill (optional; if missing, the skill offers to download it, and otherwise fills SEO values with basic rules)
- A Cloudflare account (optional, for deployment)
- `GITHUB_TOKEN` (optional; raises the GitHub API rate limit and is required for private repos)

## Installation

`<skills-dir>` is the skill directory your harness scans.

### Clone from GitHub

```bash
git clone https://github.com/agenvoy/skill-wiki-generate.git \
    <skills-dir>/wiki-generate
```

### Verify the Installation

```bash
ls <skills-dir>/wiki-generate/SKILL.md
ls <skills-dir>/wiki-generate/scripts/templates/build.js
```

Invoke it in your harness with `/wiki-generate`.

## Configuration

### Author Config (Shared with readme-generate)

Author details live in `~/.skill-readme-generate.json`; an existing readme-generate setup is reused as is. When the file is missing, the agent asks for the four fields and writes them.

```bash
python3 <skills-dir>/wiki-generate/scripts/setup_config.py check
```

| Field | Purpose |
|-------|---------|
| `author_name` | Byline, JSON-LD Person, author name at the end of titles |
| `author_email` | Contact |
| `author_url` | Byline link; default source of the Person `@id` |
| `github_owner` | Default `{owner}` and the byline author handle |
| `same_as` | Required Person `sameAs` list; every entry is included |

### Site Config (First Run per Project)

Stored in the target project's `wiki-worker/.doc/seo/config.json`; missing fields are asked for on the first run. Keywords, AI usage preferences, and other SEO settings belong to `/seo-optimize` in `<project_root>/.doc/seo-optimize/config.json`, and this skill does not ask for them.

| Field | Purpose | Default |
|-------|---------|---------|
| `site_name` | Site name; package projects always use `{owner}/{repo}` | `{owner}/{repo}` |
| `domain` | Production domain (canonical, sitemap, llms.txt) | Derived from `wrangler.toml` or the repo homepage; asked for otherwise |
| `gtag_id` | Google Analytics ID | Empty (not injected) |
| `author_name_zh` | Author name in ZH page titles | Chinese part of `author_name` |
| `person_id` / `person_name` / `person_alt_names` | JSON-LD Person | Reuses the author site's existing `@id`, else `{author_url}#person` |
| `same_as` | Person `sameAs` and byline links | Every entry of the shared `same_as` |
| `org_name` / `org_name_zh` / `org_same_as` | Organization node, named in each page's own language | Empty (not generated) |
| `tagline` | Positioning text for the byline and llms.txt; creates no schema entity | Empty (not output) |
| `favicon` | Site favicon (`public/favicon.png`) | Left empty when no verifiable 1:1 image exists |
| `og_image` | Site-wide share image | Used only if it returns 200 as an image, else empty |
| `brand_keywords` | Brand terms appended to each page's keywords | Empty array |
| `x_default` | Language the hreflang `x-default` points to | Empty (not output); filled only when the user specifies it |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | No | `sync-tags.js` sends `Authorization: Bearer`; anonymous limit is 60 req/h, required for private repos |

## Usage

### Basic

```bash
/wiki-generate
```

Run from the target project root:

1. Load the author config; on the first run, ask for site settings
2. Run `check_coverage.py` to find undocumented and removed public symbols
3. Build a symbol index with `analyze_project.py`, then read each page's source and `CLAUDE.md` in full
4. Derive the page set (one topic per page, no page limit) and, on the first run, copy and customize the templates
5. Write `pages/home.md` (a README mirror) and English/Chinese pairs for each topic page
6. Sync GitHub Releases and compile HTML
7. Call `/seo-optimize` for research and optimization, recompile, and check the template output page by page

### Deploy After the First Run

```bash
cd wiki-worker
npm install
npm run dev
npm run deploy
```

`npm run deploy` creates the IndexNow key file before deploying and submits only URLs whose content changed afterwards.

### Refresh Selected Pages

```bash
/wiki-generate --only home,configuration
```

Unselected pages are neither read nor written, `/seo-optimize` is not called, and release sync is skipped; regenerated pages get basic-rule SEO values, and the site is still recompiled and checked.

### Custom Page Set

```bash
/wiki-generate --pages getting-started,api-reference,faq
```

### Override the Repository Path

```bash
/wiki-generate github.com/foo/bar
```

### Operate the Target Site Manually

```bash
python3 <skills-dir>/wiki-generate/scripts/check_coverage.py . \
    --write-symbols wiki-worker/public/docs/symbols.json
cd wiki-worker
node sync-tags.js
node build.js
```

`check_coverage.py` exits 1 and prints `missing`, `removed`, and `undocumented_removals` when gaps exist. `build.js` prints `OK: ...` per output; `SKIP: <slug>.md not found` means a page declared in NAV has no md file.

## Configuration Reference

### Command Arguments

| Argument | Format | Description |
|----------|--------|-------------|
| `REPO_PATH` | `github.com/{owner}/{repo}` | Override the default owner/repo |
| `--only <pages>` | Comma-separated slugs | Regenerate only these pages |
| `--pages <list>` | Comma-separated slugs | Override the derived page set |

Argument order does not matter.

### Default Page Set

| Page | Slug | Trigger |
|------|------|---------|
| Home | `home` | Always (mirrors `README.md`) |
| Getting Started | `getting-started` | Always |
| Architecture | `architecture` | `doc/architecture.md` exists or `CLAUDE.md` describes module relations; one overview diagram only |
| Core Concepts | `core-concepts` | Any non-trivial project |
| Configuration | `configuration` | `.env.example` exists or env vars are read in several places |
| CLI Reference | `cli-reference` | Command dispatch or runnable make targets |
| API Reference | `api-reference` | Library projects |

Subsystem sections of 50+ lines in `CLAUDE.md` become their own pages. A page whose opening sentence cannot cover it, that has more than four `##` sections, or whose English source exceeds about 6 KB is split into sub-pages. Slugs are lowercase-kebab-case; ZH files add a `.zh` infix.

### API Coverage (`check_coverage.py`)

| Output Field | Meaning |
|--------------|---------|
| `missing` | Public symbols in code that the docs never mention |
| `removed` | Identifiers in the docs that no longer exist in code, with `removed_in` |
| `undocumented_removals` | Historical removals found by walking tags that the docs do not record yet (Go only) |

Go projects read symbols through `go doc -all`; other languages use `analyze_project.py`. Removal records are marked with `Removed in` / `移除於`, the keywords the script recognizes.

### Output Layout

| Path | Source | Hand-Editable |
|------|--------|---------------|
| `wiki-worker/public/docs/pages/*.md` | Generated by the skill | Yes (the only source) |
| `wiki-worker/public/docs/tags/*.md`, `manifest.json` | `sync-tags.js` | No |
| `wiki-worker/public/docs/symbols.json` | `check_coverage.py --write-symbols` | No |
| `wiki-worker/public/docs/dates.json` | `build.js` (per-page content hash and dates) | No; deleting it resets every date |
| `wiki-worker/public/*.html`, `zh/*.html`, `released/*.html` | `build.js` | No |
| `wiki-worker/public/sitemap.xml`, `robots.txt`, `_headers`, `llms.txt`, `llms-full.txt` | `build.js` | No |
| `wiki-worker/public/docs.css`, `demo.js` | Overwritten from the template on every run (`demo.js` for frontend packages only) | No |
| `wiki-worker/build.js`, `sync-tags.js`, `indexnow.js`, `package.json`, `wrangler.toml` | Copied from templates | Only NAV and other page data afterwards; realigned in full when the template version is behind |
| `wiki-worker/.doc/seo/config.json` | Site config | — |

### npm Scripts (`wiki-worker/package.json`)

| Script | Behavior |
|--------|----------|
| `npm run build` | `node build.js` |
| `npm run sync-tags` | `node sync-tags.js` |
| `npm run dev` | Build, then `wrangler dev` |
| `npm run deploy` | Build, create the IndexNow key, `wrangler deploy`, then submit changed URLs |

### Template Version

`TEMPLATE_VERSION` in `scripts/templates/build.js` decides whether a project is behind: when the project's version is lower or missing, the templates are copied again and the existing page data is restored. `scripts/templates/CHANGELOG.md` records only breaking changes that projects must act on.

### SEO/AEO

| State | Behavior |
|-------|----------|
| `seo-optimize` installed | After compiling, run `/seo-optimize <project_root>`; changes go only to `pages/*.md`, `build.js` constants, or `scripts/templates/`, never to build output, followed by a recompile |
| Not installed | Ask whether to download it from `https://github.com/agenvoy/skill-seo-optimize` |
| Download declined or `--only` | Fill the home title, page descriptions, and keywords with basic rules |

| Item | Basic Rule |
|------|------------|
| Home title | Contains a product keyword; EN ≤ 60 characters, ZH ≤ 30 characters; author name once |
| Description | One sentence of actual page content; EN ≤ 160 characters, ZH ≤ 80 characters; unique, no boilerplate |
| Brand terms | Only in the byline, JSON-LD, home description, and llms.txt |
| AI usage preferences | Taken from `ai_usage` in the `/seo-optimize` config; otherwise asked, never filled in by the agent |

Built-in template output: canonical and `en`/`zh-Hant-TW` hreflang, OG/Twitter, exactly one h1 per page, JSON-LD (Person, WebSite, optional Organization; `SoftwareSourceCode` on the home page, `TechArticle` elsewhere), content-hash dates, robots.txt, sitemap, llms.txt with per-page Markdown, and a visible byline.
