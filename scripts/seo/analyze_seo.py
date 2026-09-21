#!/usr/bin/env python3
"""
Inventory a project's SEO / AEO surface.

Emits JSON describing: project type, page-level metadata (title / description /
canonical / OG / structured data), crawler directives (robots.txt / sitemap /
llms.txt), framework-level metadata APIs, content files, and package metadata.

Reports only what is present in the tree. Absent surfaces are reported as
absent, never inferred.
"""

import json
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path

IGNORE_DIRS = {
    ".git",
    "node_modules",
    "vendor",
    ".idea",
    ".vscode",
    "__pycache__",
    ".pytest_cache",
    "dist",
    "build",
    "target",
    ".next",
    ".nuxt",
    ".svelte-kit",
    ".astro",
    ".output",
    ".wrangler",
    "coverage",
    ".nyc_output",
    ".venv",
    "venv",
}

HTML_EXTS = {".html", ".htm"}
CONTENT_EXTS = {".md", ".mdx", ".markdown"}
SCRIPT_EXTS = {".js", ".jsx", ".ts", ".tsx", ".astro", ".vue", ".svelte"}

# Framework / project-type indicator files, checked in priority order.
WEB_FRAMEWORK_FILES = [
    ("next", ("next.config.js", "next.config.mjs", "next.config.ts")),
    ("astro", ("astro.config.mjs", "astro.config.ts", "astro.config.js")),
    ("nuxt", ("nuxt.config.ts", "nuxt.config.js")),
    ("sveltekit", ("svelte.config.js", "svelte.config.ts")),
    ("docusaurus", ("docusaurus.config.js", "docusaurus.config.ts")),
    ("mkdocs", ("mkdocs.yml", "mkdocs.yaml")),
    ("hugo", ("hugo.toml", "hugo.yaml", "config.toml")),
    ("jekyll", ("_config.yml",)),
    ("vitepress", (".vitepress/config.ts", ".vitepress/config.js")),
    ("gatsby", ("gatsby-config.js", "gatsby-config.ts")),
    ("remix", ("remix.config.js",)),
    ("vite", ("vite.config.js", "vite.config.ts")),
]

DEPLOY_FILES = (
    "wrangler.toml",
    "wrangler.jsonc",
    "wrangler.json",
    "vercel.json",
    "netlify.toml",
    "Dockerfile",
    "firebase.json",
)

# Metadata APIs worth reporting because they are where page metadata is authored.
METADATA_API_PATTERNS = {
    "next_metadata_export": re.compile(r"export\s+const\s+metadata\b"),
    "next_generate_metadata": re.compile(r"export\s+(?:async\s+)?function\s+generateMetadata\b"),
    "next_viewport": re.compile(r"export\s+const\s+viewport\b"),
    "use_seo_meta": re.compile(r"\buseSeoMeta\s*\("),
    "use_head": re.compile(r"\buseHead\s*\("),
    "svelte_head": re.compile(r"<svelte:head>"),
    "react_helmet": re.compile(r"\bHelmet\b"),
    "jsonld_inline": re.compile(r"application/ld\+json"),
    "hreflang": re.compile(r'rel=["\']alternate["\']'),
}

TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.DOTALL | re.IGNORECASE)
META_RE = re.compile(r"<meta\s+([^>]*?)/?>", re.IGNORECASE)
LINK_RE = re.compile(r"<link\s+([^>]*?)/?>", re.IGNORECASE)
ATTR_RE = re.compile(r"""([\w:.\-]+)\s*=\s*["']([^"']*)["']""")
JSONLD_RE = re.compile(
    r"""<script[^>]*type=["']application/ld\+json["'][^>]*>(.*?)</script>""",
    re.DOTALL | re.IGNORECASE,
)
H1_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.DOTALL | re.IGNORECASE)
H2_RE = re.compile(r"<h2[^>]*>(.*?)</h2>", re.DOTALL | re.IGNORECASE)
HTML_LANG_RE = re.compile(r"""<html[^>]*\slang=["']([^"']+)["']""", re.IGNORECASE)
TAG_RE = re.compile(r"<[^>]+>")
SCRIPT_STYLE_RE = re.compile(
    r"<(script|style)\b[^>]*>.*?</\1>", re.DOTALL | re.IGNORECASE
)
FRONTMATTER_RE = re.compile(r"\A---\r?\n(.*?)\r?\n---", re.DOTALL)
FM_FIELD_RE = re.compile(r"^([\w\-]+)\s*:\s*(.*)$", re.MULTILINE)
MD_H1_RE = re.compile(r"^#\s+(.+)$", re.MULTILINE)

USER_AGENT_RE = re.compile(r"^\s*User-agent\s*:\s*(.+)$", re.IGNORECASE | re.MULTILINE)
DISALLOW_RE = re.compile(r"^\s*Disallow\s*:\s*(.*)$", re.IGNORECASE | re.MULTILINE)
SITEMAP_DIRECTIVE_RE = re.compile(r"^\s*Sitemap\s*:\s*(.+)$", re.IGNORECASE | re.MULTILINE)

# Crawlers split by purpose: blocking a training bot does not cost citations;
# blocking a retrieval bot does.
AI_TRAINING_BOTS = {
    "GPTBot",
    "ClaudeBot",
    "Google-Extended",
    "Applebot-Extended",
    "Meta-ExternalAgent",
    "Bytespider",
    "CCBot",
    "anthropic-ai",
    "cohere-ai",
    "Amazonbot",
}
AI_RETRIEVAL_BOTS = {
    "OAI-SearchBot",
    "ChatGPT-User",
    "Claude-SearchBot",
    "Claude-User",
    "PerplexityBot",
    "Perplexity-User",
    "Googlebot",
    "Bingbot",
    "Applebot",
    "DuckAssistBot",
}


@dataclass
class PageInfo:
    path: str
    title: str = ""
    title_length: int = 0
    description: str = ""
    description_length: int = 0
    canonical: str = ""
    lang: str = ""
    robots_meta: str = ""
    og: dict = field(default_factory=dict)
    twitter: dict = field(default_factory=dict)
    jsonld_types: list = field(default_factory=list)
    jsonld_invalid: int = 0
    hreflang: list = field(default_factory=list)
    h1: list = field(default_factory=list)
    h2_count: int = 0
    word_count: int = 0


@dataclass
class ContentInfo:
    path: str
    title: str = ""
    description: str = ""
    keywords: str = ""
    has_frontmatter: bool = False
    h1: str = ""
    word_count: int = 0


@dataclass
class CrawlerDirectives:
    robots_txt: str = ""
    robots_txt_agents: list = field(default_factory=list)
    robots_txt_blocked_training: list = field(default_factory=list)
    robots_txt_blocked_retrieval: list = field(default_factory=list)
    robots_txt_sitemaps: list = field(default_factory=list)
    sitemap_files: list = field(default_factory=list)
    sitemap_generators: list = field(default_factory=list)
    llms_txt: str = ""
    manifest: str = ""


def _iter_files(root: Path):
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in IGNORE_DIRS for part in path.parts):
            continue
        yield path


def _read(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None


def _attrs(fragment: str) -> dict:
    return {k.lower(): v for k, v in ATTR_RE.findall(fragment)}


def _strip_tags(html: str) -> str:
    return TAG_RE.sub(" ", SCRIPT_STYLE_RE.sub(" ", html))


def _text_word_count(text: str) -> int:
    # CJK has no spaces: count CJK codepoints individually, latin runs as words.
    cjk = len(re.findall(r"[一-鿿぀-ヿ가-힯]", text))
    latin = len(re.findall(r"[A-Za-z0-9][A-Za-z0-9'\-]*", text))
    return cjk + latin


def _collect_meta(content: str, page: PageInfo) -> None:
    for fragment in META_RE.findall(content):
        attr = _attrs(fragment)
        value = attr.get("content", "")
        key = (attr.get("name") or attr.get("property") or attr.get("http-equiv") or "").lower()
        if not key:
            continue
        if key == "description":
            page.description = value
        elif key == "robots":
            page.robots_meta = value
        elif key.startswith("og:"):
            page.og[key] = value
        elif key.startswith("twitter:"):
            page.twitter[key] = value


def _collect_links(content: str, page: PageInfo) -> None:
    for fragment in LINK_RE.findall(content):
        attr = _attrs(fragment)
        rel = attr.get("rel", "").lower()
        if rel == "canonical":
            page.canonical = attr.get("href", "")
        elif rel == "alternate" and attr.get("hreflang"):
            page.hreflang.append(attr["hreflang"])


def _collect_jsonld(content: str, page: PageInfo) -> None:
    for block in JSONLD_RE.findall(content):
        try:
            data = json.loads(block.strip())
        except json.JSONDecodeError:
            page.jsonld_invalid += 1
            continue
        for node in data if isinstance(data, list) else [data]:
            if not isinstance(node, dict):
                continue
            graph = node.get("@graph")
            nodes = graph if isinstance(graph, list) else [node]
            for item in nodes:
                if isinstance(item, dict) and item.get("@type"):
                    types = item["@type"]
                    page.jsonld_types.extend(
                        types if isinstance(types, list) else [types]
                    )


def parse_html(path: Path, rel: str) -> PageInfo | None:
    content = _read(path)
    if content is None:
        return None

    page = PageInfo(path=rel)
    if m := TITLE_RE.search(content):
        page.title = _strip_tags(m.group(1)).strip()
        page.title_length = len(page.title)
    if m := HTML_LANG_RE.search(content):
        page.lang = m.group(1)

    _collect_meta(content, page)
    _collect_links(content, page)
    _collect_jsonld(content, page)

    page.description_length = len(page.description)
    page.h1 = [_strip_tags(h).strip() for h in H1_RE.findall(content)]
    page.h2_count = len(H2_RE.findall(content))
    page.word_count = _text_word_count(_strip_tags(content))
    return page


def parse_content(path: Path, rel: str) -> ContentInfo | None:
    text = _read(path)
    if text is None:
        return None

    info = ContentInfo(path=rel)
    body = text
    if m := FRONTMATTER_RE.search(text):
        info.has_frontmatter = True
        body = text[m.end() :]
        fields = {k.lower(): v.strip().strip("\"'") for k, v in FM_FIELD_RE.findall(m.group(1))}
        info.title = fields.get("title", "")
        info.description = fields.get("description", fields.get("summary", ""))
        info.keywords = fields.get("keywords", fields.get("tags", ""))
    if m := MD_H1_RE.search(body):
        info.h1 = m.group(1).strip()
    info.word_count = _text_word_count(body)
    return info


def _classify_robots_agents(text: str) -> tuple[list, list, list]:
    """Return (all agents, blocked training bots, blocked retrieval bots)."""
    agents = [a.strip() for a in USER_AGENT_RE.findall(text)]
    blocked_training: list[str] = []
    blocked_retrieval: list[str] = []

    # Split into per-agent blocks to attribute Disallow lines correctly.
    blocks = re.split(r"(?=^\s*User-agent\s*:)", text, flags=re.IGNORECASE | re.MULTILINE)
    for block in blocks:
        names = [a.strip() for a in USER_AGENT_RE.findall(block)]
        if not names:
            continue
        disallows = [d.strip() for d in DISALLOW_RE.findall(block)]
        if "/" not in disallows:
            continue
        for name in names:
            lowered = name.lower()
            if any(lowered == b.lower() for b in AI_TRAINING_BOTS):
                blocked_training.append(name)
            elif any(lowered == b.lower() for b in AI_RETRIEVAL_BOTS):
                blocked_retrieval.append(name)
            elif name == "*":
                blocked_training.append("* (wildcard)")
                blocked_retrieval.append("* (wildcard)")
    return agents, blocked_training, blocked_retrieval


def collect_crawler_directives(root: Path, files: list[Path]) -> CrawlerDirectives:
    directives = CrawlerDirectives()

    for path in files:
        rel = str(path.relative_to(root))
        name = path.name.lower()
        if name == "robots.txt" and not directives.robots_txt:
            directives.robots_txt = rel
            if text := _read(path):
                agents, training, retrieval = _classify_robots_agents(text)
                directives.robots_txt_agents = agents
                directives.robots_txt_blocked_training = training
                directives.robots_txt_blocked_retrieval = retrieval
                directives.robots_txt_sitemaps = [
                    s.strip() for s in SITEMAP_DIRECTIVE_RE.findall(text)
                ]
        elif name.startswith("sitemap") and path.suffix in {".xml", ".txt"}:
            directives.sitemap_files.append(rel)
        elif name == "llms.txt" and not directives.llms_txt:
            directives.llms_txt = rel
        elif (
            name in {"manifest.json", "site.webmanifest"}
            and not directives.manifest
            # A nested manifest.json is usually unrelated build output, not a
            # web app manifest.
            and len(path.relative_to(root).parts) <= 2
        ):
            directives.manifest = rel
        elif path.stem in {"sitemap", "robots"} and path.suffix in {".ts", ".js"}:
            directives.sitemap_generators.append(rel)

    return directives


# Directory names that conventionally mark the root of a servable site.
SITE_ROOT_DIRS = ("public", "dist", "static", "www", "site", "_site", "docs", "out")


def group_web_surfaces(pages: list[PageInfo], framework: str) -> list[dict]:
    """
    Group HTML pages into servable sites.

    A repo can hold several at once — e.g. a Go library whose `wiki-worker/public/`
    is a deployed docs site. Each surface gets optimized on its own terms, so they
    must not be collapsed into a single project type.
    """
    groups: dict[str, list[PageInfo]] = {}
    for page in pages:
        parts = Path(page.path).parts
        site_root = "."
        for i, part in enumerate(parts[:-1]):
            if part in SITE_ROOT_DIRS:
                site_root = str(Path(*parts[: i + 1]))
                break
        groups.setdefault(site_root, []).append(page)

    surfaces = []
    for site_root, members in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        has_index = any(Path(p.path).name in {"index.html", "index.htm"} for p in members)
        surfaces.append(
            {
                "root": site_root,
                "page_count": len(members),
                "has_index": has_index,
                "framework": framework,
                "kind": "docs-site"
                if "doc" in site_root or "wiki" in site_root
                else "static-site",
            }
        )
    return surfaces


def detect_code_type(root: Path, has_web_framework: str) -> str:
    """Classify the codebase itself. Web surfaces are reported separately."""
    pkg = root / "package.json"
    if has_web_framework in {"docusaurus", "mkdocs", "vitepress"}:
        return "docs-site"
    if has_web_framework:
        return "web-app"
    if pkg.exists():
        try:
            data = json.loads(pkg.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            data = {}
        if data.get("bin"):
            return "cli"
        if data.get("main") or data.get("exports"):
            return "library"
    if (root / "go.mod").exists():
        has_main = any(
            "package main" in (_read(p) or "")
            for p in root.rglob("*.go")
            if not any(part in IGNORE_DIRS for part in p.parts)
        )
        return "cli" if has_main else "library"
    if (root / "pyproject.toml").exists() or (root / "composer.json").exists():
        return "library"
    return "unknown"


def detect_web_framework(root: Path) -> str:
    for name, candidates in WEB_FRAMEWORK_FILES:
        for candidate in candidates:
            if (root / candidate).exists():
                return name
    return ""


def _parse_json_file(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def collect_package_metadata(root: Path) -> dict:
    """Registry-facing metadata — the SEO surface of a non-web project."""
    meta: dict = {}

    if (pkg := root / "package.json").exists():
        data = _parse_json_file(pkg)
        meta["npm"] = {
            "name": data.get("name", ""),
            "description": data.get("description", ""),
            "keywords": data.get("keywords", []),
            "homepage": data.get("homepage", ""),
            "repository": data.get("repository", ""),
        }

    if (mod := root / "go.mod").exists():
        if text := _read(mod):
            if m := re.search(r"^module\s+(.+)$", text, re.MULTILINE):
                meta["go"] = {"module": m.group(1).strip()}

    if (pyproject := root / "pyproject.toml").exists():
        if text := _read(pyproject):
            meta["pypi"] = {
                "name": _toml_field(text, "name"),
                "description": _toml_field(text, "description"),
                "keywords": _toml_field(text, "keywords"),
            }

    if (composer := root / "composer.json").exists():
        data = _parse_json_file(composer)
        meta["packagist"] = {
            "name": data.get("name", ""),
            "description": data.get("description", ""),
            "keywords": data.get("keywords", []),
        }

    return meta


def _toml_field(text: str, key: str) -> str:
    m = re.search(rf'^{key}\s*=\s*(.+)$', text, re.MULTILINE)
    return m.group(1).strip().strip("\"'") if m else ""


def scan_metadata_apis(files: list[Path], root: Path) -> dict:
    """Where page metadata is authored, when it is not in static HTML."""
    hits: dict[str, list[str]] = {}
    for path in files:
        if path.suffix not in SCRIPT_EXTS:
            continue
        content = _read(path)
        if content is None:
            continue
        rel = str(path.relative_to(root))
        for label, pattern in METADATA_API_PATTERNS.items():
            if pattern.search(content):
                hits.setdefault(label, []).append(rel)
    return {k: sorted(v)[:40] for k, v in hits.items()}


def analyze(root_path: str) -> dict:
    root = Path(root_path).resolve()
    if not root.exists():
        return {"error": f"Path does not exist: {root_path}"}

    files = list(_iter_files(root))

    pages: list[PageInfo] = []
    contents: list[ContentInfo] = []
    for path in files:
        rel = str(path.relative_to(root))
        if path.suffix.lower() in HTML_EXTS:
            if (page := parse_html(path, rel)) is not None:
                pages.append(page)
        elif path.suffix.lower() in CONTENT_EXTS:
            if (info := parse_content(path, rel)) is not None:
                contents.append(info)

    framework = detect_web_framework(root)
    code_type = detect_code_type(root, framework)
    surfaces = group_web_surfaces(pages, framework)
    if code_type == "unknown" and surfaces:
        code_type = surfaces[0]["kind"]
    directives = collect_crawler_directives(root, files)

    git_remote = ""
    if (config := root / ".git" / "config").exists():
        if text := _read(config):
            if m := re.search(r"url\s*=\s*(.+)", text):
                git_remote = m.group(1).strip()

    return {
        "root": str(root),
        "code_type": code_type,
        "web_surfaces": surfaces,
        "web_framework": framework,
        "deploy_targets": [f for f in DEPLOY_FILES if (root / f).exists()],
        "git_remote": git_remote,
        "package_metadata": collect_package_metadata(root),
        "crawler_directives": asdict(directives),
        "metadata_apis": scan_metadata_apis(files, root),
        "page_count": len(pages),
        "pages": [asdict(p) for p in pages[:200]],
        "content_count": len(contents),
        "contents": [asdict(c) for c in contents[:200]],
        "existing_config": str((root / ".doc" / "seo" / "config.json"))
        if (root / ".doc" / "seo" / "config.json").exists()
        else "",
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: analyze_seo.py <project_path>", file=sys.stderr)
        sys.exit(1)
    print(json.dumps(analyze(sys.argv[1]), indent=2, ensure_ascii=False))
