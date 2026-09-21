# wiki-generate - Documentation

> Back to [README](../README.md)

## Prerequisites

- An agent harness that loads `SKILL.md` skills, runs shell commands, and can search and fetch web pages (SEO research needs network access)
- Python 3.10 or higher (runs `setup_config.py`, `analyze_project.py`, `analyze_seo.py`)
- Node.js and npm (builds the docs site and syncs release history in the target project)
- Git; the target project root must contain `README.md`
- A Cloudflare account (optional, for deployment)
- `GITHUB_TOKEN` (optional; raises the GitHub API rate limit and is required for private repos)

## Installation

`<skills-dir>` is the skill directory your harness scans.

### Clone from GitHub

```bash
git clone https://github.com/agenvoy/skill-wiki-generate.git \
    <skills-dir>/wiki-generate
```

### Verify Installation

```bash
ls <skills-dir>/wiki-generate/SKILL.md
ls <skills-dir>/wiki-generate/scripts/templates/build.js
```

Invoke it from your harness with `/wiki-generate`.

## Configuration

### Author Config (Shared with readme-generate)

Author details live in `~/.skill-readme-generate.json`, so an existing readme-generate setup is reused as is; when it is missing, the agent asks the user for the four fields and writes them.

```bash
python3 <skills-dir>/wiki-generate/scripts/setup_config.py check
```

| Field | Purpose |
|-------|---------|
| `author_name` | Byline, JSON-LD Person, author name at the end of titles |
| `author_email` | Contact detail |
| `author_url` | Byline link; default source for the Person `@id` |
| `github_owner` | Default `{owner}` and `sameAs` entry |

### Site and SEO Config (First Run per Project)

Stored in the target project's `wiki-worker/.doc/seo/config.json`; missing fields are asked for on the first run.

| Field | Purpose | Default |
|-------|---------|---------|
| `site_name` | Site name; package projects always use `{owner}/{repo}` | `{owner}/{repo}` |
| `domain` | Production domain (canonical, sitemap, llms.txt) | Derived from `wrangler.toml` or the repo homepage, otherwise asked |
| `gtag_id` | Google Analytics ID | Empty string (not injected) |
| `primary_keywords` / `secondary_keywords` | Title and description keywords | Candidates proposed after reading the source |
| `author_name_zh` | Author name in ZH page titles | Chinese part of `author_name` |
| `person_id` / `person_name` / `person_alt_names` | JSON-LD Person | Reuses the author site's existing `@id`, otherwise `{author_url}#person` |
| `same_as` | Person `sameAs` and byline external links | GitHub profile and `author_url` |
| `org_name` | Organization node | Empty string (omitted) |
| `og_image` | Site-wide share image | Used only after verifying a 200 image response, otherwise empty |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | No | Sent by `sync-tags.js` as `Authorization: Bearer`; anonymous limit is 60 req/h, required for private repos |

## Usage

### Basic

```bash
/wiki-generate
```

Run from the target project root:

1. Load the author config; on the first run, ask for site and SEO settings
2. Build a symbol index with `analyze_project.py`, then read each page's source and `CLAUDE.md` in full
3. Research current SEO/AEO practice per the protocol and write a research digest
4. Derive a 6–12 page set; on the first run, copy and customize the templates
5. Write `pages/home.md` (mirroring the README) and an English/Chinese pair for each topic page
6. Sync GitHub Releases, compile HTML, run SEO verification, and write the report

### Deploy After the First Run

```bash
cd wiki-worker
npm install
npm run dev
npm run deploy
```

### Refresh Selected Pages

```bash
/wiki-generate --only home,configuration
```

Unselected pages are neither read nor written, and SEO research and release sync are skipped; the site is still recompiled and verified.

### Customize the Page Set

```bash
/wiki-generate --pages getting-started,api-reference,faq
```

### Override Repository Path

```bash
/wiki-generate github.com/foo/bar
```

### Run the Target Project's Site Manually

```bash
cd wiki-worker
node sync-tags.js
node build.js
python3 <skills-dir>/wiki-generate/scripts/seo/analyze_seo.py .
```

`build.js` prints `OK: ...` per output; `SKIP: <slug>.md not found` means a page declared in NAV has no markdown file.

## Configuration Reference

### Command Arguments

| Argument | Format | Description |
|----------|--------|-------------|
| `REPO_PATH` | `github.com/{owner}/{repo}` | Override the default owner/repo |
| `--only <pages>` | Comma-separated slugs | Regenerate only the named pages |
| `--pages <list>` | Comma-separated slugs | Override the auto-derived page set |

Arguments are order-independent.

### Default Page Set

| Page | Slug | Trigger |
|------|------|---------|
| Home | `home` | Always (mirrors `README.md`) |
| Getting Started | `getting-started` | Always |
| Architecture | `architecture` | `doc/architecture.md` exists or `CLAUDE.md` describes module relations; one overview diagram only |
| Core Concepts | `core-concepts` | Any non-trivial project |
| Configuration | `configuration` | `.env.example` exists or environment variables are read in several places |
| CLI Reference | `cli-reference` | Command dispatch or runnable make targets |
| API Reference | `api-reference` | Library projects |

Subsystem sections of 50+ lines in `CLAUDE.md` become dedicated pages. Slugs are always lowercase-kebab-case, with a `.zh` infix for the Chinese version.

### Output Layout

| Path | Produced By | Hand-Editable |
|------|-------------|---------------|
| `wiki-worker/public/docs/pages/*.md` | The skill | Yes (the only source) |
| `wiki-worker/public/docs/tags/*.md`, `manifest.json` | `sync-tags.js` | No |
| `wiki-worker/public/*.html`, `zh/*.html`, `released/*.html` | `build.js` | No |
| `wiki-worker/public/sitemap.xml`, `robots.txt`, `llms.txt` | `build.js` | No |
| `wiki-worker/public/docs.css` | Overwritten from the template on every run | No |
| `wiki-worker/build.js`, `sync-tags.js`, `package.json`, `wrangler.toml` | Copied from templates on the first run | Afterwards only NAV and page data change |
| `wiki-worker/.doc/seo/` | Config, research digests, applied reports | — |

### npm Scripts (`wiki-worker/package.json`)

| Script | Behavior |
|--------|----------|
| `npm run build` | `node build.js` |
| `npm run sync-tags` | `node sync-tags.js` |
| `npm run dev` | Build, then `wrangler dev` |
| `npm run deploy` | Build, then `wrangler deploy` |

### SEO/AEO Rule Mapping

| Rule | Output |
|------|--------|
| R1 Title | Home title carries product keywords; EN ≤ 60 characters, ZH ≤ 30 characters |
| R2 Description | One sentence of real page content; EN ≤ 160 characters, ZH ≤ 80 characters, no boilerplate |
| R3 canonical / hreflang | `en` and `zh-Hant-TW` alternates, no `x-default` |
| R4 OG / Twitter | `website` on the home page, `article` elsewhere; image meta omitted without `og_image` |
| R5 Heading hierarchy | Exactly one h1 per page |
| R6 JSON-LD | Person, WebSite, optional Organization; `SoftwareSourceCode` on home, `TechArticle` elsewhere |
| R7 robots / sitemap / llms.txt | No retrieval bots blocked; sitemap covers every page; llms.txt URLs match real pages |
| R8 / R9 | Package registry and repo metadata go into the report only, never executed |
| R10 Entity consistency | Author and organization spelled identically in byline, JSON-LD, and llms.txt |

### SEO Files

| File | Purpose |
|------|---------|
| `scripts/seo/research_protocol.md` | Research queries, source tiers, and digest format |
| `scripts/seo/knowledge_anchors.md` | Verified first-party positions, updated in place after research |
| `scripts/seo/optimization_rules.md` | R1–R10 criteria, actions, and prohibitions |
| `scripts/seo/output_format.md` | Applied-report format |
| `scripts/seo/analyze_seo.py` | Post-build per-page inventory of title, description, h1, OG, JSON-LD, hreflang, and crawler directives |
