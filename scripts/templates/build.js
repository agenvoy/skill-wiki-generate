const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

// === Site config — filled in by wiki-generate when this template is copied into a project ===
const SITE_NAME = "{{SITE_NAME}}";
const DOMAIN = "{{DOMAIN}}";
const REPO = "{{REPO}}"; // owner/repo
const AUTHOR_NAME = "{{AUTHOR_NAME}}";
const AUTHOR_NAME_ZH = "{{AUTHOR_NAME_ZH}}";
const AUTHOR_URL = "{{AUTHOR_URL}}";
const GTAG_ID = "{{GTAG_ID}}"; // empty string disables analytics

// === SEO / entity config — filled in by wiki-generate (SKILL.md Step 0.3 / Step 8) ===
const PERSON_ID = "{{PERSON_ID}}";
const PERSON_NAME = "{{PERSON_NAME}}";
const PERSON_ALT_NAMES = [
  // {{PERSON_ALT_NAMES}}
];
const SAME_AS = [
  // {{SAME_AS}}
];
const ORG_NAME = "{{ORG_NAME}}"; // empty string omits the Organization node and byline segment
const TAGLINE = "{{TAGLINE}}"; // byline-only positioning text (e.g. "Taiwan · Infrastructure Engineering"); never becomes an Organization entity
const ORG_ID = "{{ORG_ID}}";
const ORG_URL = "{{ORG_URL}}";
const OG_IMAGE = "{{OG_IMAGE}}"; // empty string omits og:image / twitter:image
const HOME_TITLE = "{{HOME_TITLE}}";
const HOME_TITLE_ZH = "{{HOME_TITLE_ZH}}";
const PROGRAMMING_LANGUAGE = "{{PROGRAMMING_LANGUAGE}}";
const LICENSE_URL = "{{LICENSE_URL}}"; // empty string omits license
const ZH_LANG = "zh-Hant-TW";

const OWNER = REPO.split("/")[0];

const PAGES_DIR = path.join(__dirname, "public/docs/pages");
const OUT_DIR = path.join(__dirname, "public");
const ZH_DIR = path.join(__dirname, "public/zh");
const TAGS_DIR = path.join(__dirname, "public/docs/tags"); // release notes synced by sync-tags.js
const RELEASED_DIR = path.join(OUT_DIR, "released");

// newest first; missing parts count as 0 so "v1.2" sorts against "v1.2.0"
function semverSort(a, b) {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
  }
  return 0;
}

function loadTags() {
  if (!fs.existsSync(TAGS_DIR)) return { tags: [], dates: {} };
  const tags = fs.readdirSync(TAGS_DIR)
    .filter(f => f.endsWith(".md"))
    .map(f => f.replace(/\.md$/, ""))
    .sort(semverSort);
  const manifestPath = path.join(TAGS_DIR, "manifest.json");
  const dates = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : {};
  return { tags, dates };
}

// group tags by minor version: v0.28.3 -> "v0.28"
function groupByMinor(tags) {
  const groups = new Map();
  for (const t of tags) {
    const p = t.replace(/^v/, "").split(".");
    const key = `v${p[0]}.${p[1]}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  return groups;
}

const { tags: TAGS, dates: TAG_DATES } = loadTags();
const LATEST_VERSION = TAGS[0] || "";

// === Page navigation — filled in by wiki-generate from the derived page set ===
// { section: "Section Label", items: [{ slug: "getting-started", label: "Getting Started" }] }
const NAV = [
  // {{NAV}}
];

// slug -> English meta description (required per page)
const DESCRIPTIONS = {
  // {{DESCRIPTIONS}}
};

// slug -> English SEO keywords, comma separated
const KEYWORDS = {
  // {{KEYWORDS}}
};

// English section label -> Traditional Chinese section label
const NAV_ZH_SECTION = {
  // {{NAV_ZH_SECTION}}
};

// slug -> Traditional Chinese nav label
const NAV_ZH_LABEL = {
  // {{NAV_ZH_LABEL}}
};

// slug -> Traditional Chinese meta description
const DESCRIPTIONS_ZH = {
  // {{DESCRIPTIONS_ZH}}
};

function slugify(text) {
  // keep CJK ranges so Chinese headings produce usable anchor ids (empty ids break the TOC)
  return text.toLowerCase()
    .replace(/[^\w\s一-鿿㐀-䶿豈-﫿-]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildSidebar(activeSlug, lang = "en") {
  const isZh = lang === "zh";
  const base = isZh ? "/zh" : "";
  let html = "";
  for (const group of NAV) {
    const section = isZh ? (NAV_ZH_SECTION[group.section] || group.section) : group.section;
    html += `<div class="nav-divider"></div>\n`;
    html += `<div class="nav-section">${section}</div>\n`;
    for (const item of group.items) {
      const cls = item.slug === activeSlug ? " active" : "";
      const href = item.slug === "home" ? `${base}/` : `${base}/${item.slug}`;
      const label = isZh ? (NAV_ZH_LABEL[item.slug] || item.label) : item.label;
      html += `<a class="nav-item${cls}" href="${href}">${label}</a>\n`;
    }
  }
  if (TAGS.length) {
    html += `<div class="nav-divider"></div>\n`;
    html += `<a class="nav-item" href="/released/">${isZh ? "版本紀錄" : "Released"}</a>\n`;
  }
  return html.replace(/^<div class="nav-divider"><\/div>\n/, "");
}

// release pages are EN-only; sidebar lists every tag grouped by minor version
function buildVersionSidebar(activeTag, tags, dates) {
  let html = '<a class="nav-item" href="/">Documentation</a>\n';
  html += `<div class="nav-divider"></div>\n`;
  for (const [minor, versions] of groupByMinor(tags)) {
    html += `<div class="nav-section">${minor}</div>\n`;
    for (const v of versions) {
      const cls = v === activeTag ? " active" : "";
      const date = dates[v] ? `<span class="nav-date">${dates[v]}</span>` : "";
      html += `<a class="nav-item${cls}" href="/released/${v}">${v}${date}</a>\n`;
    }
  }
  return html;
}

function buildTOC(html, lang = "en") {
  const tocTitle = lang === "zh" ? "本頁內容" : "On this page";
  const headings = [];
  const regex = /<h([23])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h\1>/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    headings.push({ depth: parseInt(m[1]), id: m[2], text: m[3].replace(/<[^>]+>/g, "") });
  }
  if (!headings.length) return `<div class="toc-title">${tocTitle}</div>`;
  let toc = `<div class="toc-title">${tocTitle}</div>\n`;
  for (const h of headings) {
    const cls = h.depth === 3 ? " depth-3" : "";
    toc += `<a class="toc-link${cls}" href="#${h.id}">${h.text}</a>\n`;
  }
  return toc;
}

function addHeadingIds(html) {
  return html.replace(/<h([1-4])>(.*?)<\/h\1>/g, (match, level, text) => {
    const id = slugify(text.replace(/<[^>]+>/g, ""));
    return `<h${level} id="${id}">${text}</h${level}>`;
  });
}

// wrap every table so it scrolls horizontally instead of overflowing the viewport
function wrapTables(html) {
  return html
    .replace(/<table>/g, '<div class="table-scroll"><table>')
    .replace(/<\/table>/g, "</table></div>");
}

function renderMermaid(html) {
  return html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<pre class="mermaid">$1</pre>');
}

function ensureH1(html, text) {
  if (html.includes("<h1")) return html;
  return `<h1 id="${slugify(text)}">${text}</h1>\n${html}`;
}

function profileLabel(url) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const known = { "github.com": "GitHub", "linkedin.com": "LinkedIn", "x.com": "X", "twitter.com": "X" };
  return known[host] || host;
}

const trimSlash = url => url.replace(/\/+$/, "");
const BYLINE_LINKS = SAME_AS
  .filter(u => trimSlash(u) !== trimSlash(AUTHOR_URL) && trimSlash(u) !== `https://github.com/${OWNER}`)
  .map(u => ` · <a href="${u}" target="_blank" rel="noopener">${profileLabel(u)}</a>`)
  .join("");

function renderPage(slug, title, description, keywords, sidebar, content, toc, lang = "en") {
  const isZh = lang === "zh";
  const isReleased = slug === "released" || slug.startsWith("released/");
  const base = isZh ? `${DOMAIN}/zh` : DOMAIN;
  const canonical = slug === "home" ? `${base}/` : `${base}/${slug}`;
  let fullTitle;
  if (slug === "home") {
    fullTitle = isZh ? HOME_TITLE_ZH : HOME_TITLE;
  } else {
    fullTitle = isZh
      ? `${title}｜${SITE_NAME} 文件｜${AUTHOR_NAME_ZH}`
      : `${title} - ${SITE_NAME} Docs - ${AUTHOR_NAME}`;
  }

  // language toggle target (counterpart page); released has no zh copy → fall back to zh docs home
  let altHref;
  if (isZh) altHref = slug === "home" ? "/" : `/${slug}`;
  else if (isReleased) altHref = "/zh/";
  else altHref = slug === "home" ? "/zh/" : `/zh/${slug}`;

  const enUrl = slug === "home" ? `${DOMAIN}/` : `${DOMAIN}/${slug}`;
  const zhUrl = slug === "home" ? `${DOMAIN}/zh/` : `${DOMAIN}/zh/${slug}`;
  const altLinks = isReleased ? "" :
    `<link rel="alternate" hreflang="en" href="${enUrl}" />
    <link rel="alternate" hreflang="${ZH_LANG}" href="${zhUrl}" />
    `;

  const inLanguage = isZh ? ZH_LANG : "en";
  const person = {
    "@type": "Person",
    "@id": PERSON_ID,
    "name": PERSON_NAME,
    ...(PERSON_ALT_NAMES.length ? { "alternateName": PERSON_ALT_NAMES } : {}),
    "url": AUTHOR_URL,
    ...(SAME_AS.length ? { "sameAs": SAME_AS } : {}),
  };
  const org = ORG_NAME
    ? {
      "@type": "Organization",
      "@id": ORG_ID,
      "name": ORG_NAME,
      "url": ORG_URL,
      "founder": { "@id": PERSON_ID },
      "sameAs": [`https://github.com/${OWNER}`],
    }
    : null;
  const publisher = { "@id": org ? ORG_ID : PERSON_ID };
  const website = {
    "@type": "WebSite",
    "@id": `${DOMAIN}/#website`,
    "name": SITE_NAME,
    "url": `${DOMAIN}/`,
    "inLanguage": ["en", ZH_LANG],
    "publisher": publisher,
  };
  const node = slug === "home"
    ? {
      "@type": "SoftwareSourceCode",
      "@id": `${canonical}#software`,
      "name": SITE_NAME,
      "description": description,
      "url": canonical,
      "inLanguage": inLanguage,
      "codeRepository": `https://github.com/${REPO}`,
      ...(PROGRAMMING_LANGUAGE ? { "programmingLanguage": PROGRAMMING_LANGUAGE } : {}),
      ...(LICENSE_URL ? { "license": LICENSE_URL } : {}),
      ...(LATEST_VERSION ? { "version": LATEST_VERSION } : {}),
      "author": { "@id": PERSON_ID },
      "publisher": publisher,
    }
    : {
      "@type": "TechArticle",
      "headline": fullTitle,
      "description": description,
      "url": canonical,
      "inLanguage": inLanguage,
      "isPartOf": { "@id": website["@id"] },
      "author": { "@id": PERSON_ID },
      "publisher": publisher,
    };
  const graph = org ? [person, org, website, node] : [person, website, node];
  const jsonLd = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });

  const orgSegment = ORG_NAME ? ` · ${ORG_NAME}` : "";
  const taglineSegment = TAGLINE ? ` · ${TAGLINE}` : "";
  const ownerLink = `<a href="https://github.com/${OWNER}" target="_blank" rel="noopener">${OWNER}</a>`;
  const byline = isZh
    ? `<footer class="byline">${SITE_NAME} 由<a href="${AUTHOR_URL}" rel="author">${AUTHOR_NAME}</a>（${ownerLink}）開發${orgSegment}${taglineSegment}${BYLINE_LINKS}</footer>`
    : `<footer class="byline">${SITE_NAME} is built by <a href="${AUTHOR_URL}" rel="author">${AUTHOR_NAME}</a> (${ownerLink})${orgSegment}${taglineSegment}${BYLINE_LINKS}</footer>`;

  const ogImage = OG_IMAGE
    ? `
    <meta property="og:image" content="${OG_IMAGE}" />`
    : "";
  const twitterImage = OG_IMAGE
    ? `
    <meta name="twitter:image" content="${OG_IMAGE}" />`
    : "";

  const analytics = GTAG_ID
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","${GTAG_ID}");</script>
    `
    : "";

  return `<!doctype html>
<html lang="${inLanguage}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="index, follow" />
    <title>${fullTitle}</title>
    <meta name="title" content="${fullTitle}" />
    <meta name="description" content="${description}" />
    <meta name="keywords" content="${keywords}" />
    <meta name="author" content="${AUTHOR_NAME}" />
    <link rel="author" href="${AUTHOR_URL}" />
    <link rel="canonical" href="${canonical}" />
    ${altLinks}<meta property="og:title" content="${fullTitle}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:type" content="${slug === "home" ? "website" : "article"}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="${isZh ? "zh_TW" : "en_US"}" />${ogImage}
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${fullTitle}" />
    <meta name="twitter:description" content="${description}" />${twitterImage}
    <script type="application/ld+json">${jsonLd}</script>
    ${analytics}<link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" referrerpolicy="no-referrer" />
    <link rel="stylesheet" href="/docs.css" />
  </head>
  <body>
    <header class="header">
      <button class="mobile-menu-btn" onclick="document.querySelector('.sidebar').classList.toggle('open')" aria-label="Menu"><i class="fa-solid fa-bars"></i></button>
      <a href="${isZh ? "/zh/" : "/"}" class="header-logo">${REPO}</a>
      <span class="header-sep"></span>
      <span class="header-title">${isZh ? "文件" : "Documentation"}</span>
      ${LATEST_VERSION ? `<a class="header-version" href="/released/${LATEST_VERSION}">${LATEST_VERSION}</a>` : ""}
      <div class="header-links">
        <a href="${isZh ? "/zh/" : "/"}">${isZh ? "首頁" : "Home"}</a>
        <a href="https://github.com/${REPO}" target="_blank" rel="noopener">GitHub</a>
      </div>
    </header>
    <div class="layout">
      <nav class="sidebar">${sidebar}</nav>
      <main class="content">${content}${byline}</main>
      <aside class="toc">${toc}</aside>
    </div>
    <script>
      document.querySelectorAll('.sidebar .nav-item').forEach(function(el){
        el.addEventListener('click',function(){document.querySelector('.sidebar').classList.remove('open')})
      });
      var tocObs=new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(e.isIntersecting){
            document.querySelectorAll('.toc-link').forEach(function(l){
              l.classList.toggle('active',l.getAttribute('href')==='#'+e.target.id)
            })
          }
        })
      },{rootMargin:'-80px 0px -70% 0px'});
      document.querySelectorAll('.content h2,.content h3').forEach(function(h){tocObs.observe(h)});
    </script>
    ${content.includes('<pre class="mermaid">') ? `<script type="module">import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";mermaid.initialize({startOnLoad:true,theme:"neutral",securityLevel:"strict"});</script>` : ""}
    ${isReleased ? "" : `<a href="${altHref}" class="lang-fab" aria-label="${isZh ? "Switch to English" : "Switch to Chinese"}" hreflang="${isZh ? "en" : ZH_LANG}"><i class="fa-solid fa-language"></i><span>${isZh ? "EN" : "中文"}</span></a>`}
  </body>
</html>`;
}

function releaseDescription(md, tag) {
  const fallback = `${SITE_NAME} ${tag} release notes — changelog, new features, and fixes.`;
  const match = md.match(/^## Summary\s*\n+([^\n#][^\n]*)/m);
  if (!match) return fallback;
  const text = `${SITE_NAME} ${tag}: ${match[1].replace(/["`]/g, "").trim()}`;
  if (text.length <= 155) return text;
  const cut = text.slice(0, 155);
  const sentence = cut.lastIndexOf(". ");
  if (sentence > 60) return cut.slice(0, sentence + 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}...`;
}

marked.setOptions({ gfm: true, breaks: false });

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(ZH_DIR, { recursive: true });

const allSlugs = NAV.flatMap(g => g.items.map(i => i.slug));
let built = 0;
let builtZh = 0;
const zhSlugs = [];

for (const slug of allSlugs) {
  const mdPath = path.join(PAGES_DIR, `${slug}.md`);
  if (!fs.existsSync(mdPath)) {
    console.warn(`SKIP: ${slug}.md not found`);
    continue;
  }

  const md = fs.readFileSync(mdPath, "utf-8");
  let html = marked.parse(md);
  html = renderMermaid(wrapTables(addHeadingIds(html)));
  if (slug === "home") html = ensureH1(html, SITE_NAME);

  const label = NAV.flatMap(g => g.items).find(i => i.slug === slug)?.label || slug;
  const desc = DESCRIPTIONS[slug] || `${label} — ${SITE_NAME} documentation.`;
  const kw = KEYWORDS[slug] || `${SITE_NAME.toLowerCase()}, documentation`;
  const sidebar = buildSidebar(slug, "en");
  const toc = buildTOC(html);
  const page = renderPage(slug, label, desc, kw, sidebar, html, toc, "en");

  const outPath = slug === "home"
    ? path.join(OUT_DIR, "index.html")
    : path.join(OUT_DIR, `${slug}.html`);

  fs.writeFileSync(outPath, page);
  built++;
  console.log(`OK: ${outPath}`);

  // zh variant — generated only when a translated source exists
  const zhMdPath = path.join(PAGES_DIR, `${slug}.zh.md`);
  if (fs.existsSync(zhMdPath)) {
    let zhHtml = renderMermaid(wrapTables(addHeadingIds(marked.parse(fs.readFileSync(zhMdPath, "utf-8")))));
    if (slug === "home") zhHtml = ensureH1(zhHtml, SITE_NAME);
    const zhLabel = NAV_ZH_LABEL[slug] || label;
    const zhDesc = DESCRIPTIONS_ZH[slug] || desc;
    const zhSidebar = buildSidebar(slug, "zh");
    const zhToc = buildTOC(zhHtml, "zh");
    const zhPage = renderPage(slug, zhLabel, zhDesc, kw, zhSidebar, zhHtml, zhToc, "zh");
    const zhOut = slug === "home"
      ? path.join(ZH_DIR, "index.html")
      : path.join(ZH_DIR, `${slug}.html`);
    fs.writeFileSync(zhOut, zhPage);
    builtZh++;
    zhSlugs.push(slug);
    console.log(`OK: ${zhOut}`);
  }
}

// === release pages (public/docs/tags/*.md -> /released/<tag>) ===
const releaseTags = [];

if (TAGS.length) {
  fs.mkdirSync(RELEASED_DIR, { recursive: true });

  for (const tag of TAGS) {
    const md = fs.readFileSync(path.join(TAGS_DIR, `${tag}.md`), "utf-8");
    const html = ensureH1(renderMermaid(wrapTables(addHeadingIds(marked.parse(md)))), `${tag} Release Notes`);
    const sidebar = buildVersionSidebar(tag, TAGS, TAG_DATES);
    const toc = buildTOC(html);
    const desc = releaseDescription(md, tag);
    const kw = `${SITE_NAME.toLowerCase()}, release notes, changelog, ${tag}`;
    const page = renderPage(`released/${tag}`, `${tag} Release Notes`, desc, kw, sidebar, html, toc);
    fs.writeFileSync(path.join(RELEASED_DIR, `${tag}.html`), page);
    releaseTags.push(tag);
  }

  let listHtml = `<h1>Release Notes</h1>\n<p>All ${SITE_NAME} releases.</p>\n`;
  for (const [minor, versions] of groupByMinor(TAGS)) {
    listHtml += `<h2>${minor}</h2>\n<ul>\n`;
    for (const v of versions) {
      const date = TAG_DATES[v] ? ` <span style="color:var(--muted);font-size:13px">${TAG_DATES[v]}</span>` : "";
      listHtml += `<li><a href="/released/${v}">${v}</a>${date}</li>\n`;
    }
    listHtml += `</ul>\n`;
  }
  listHtml = addHeadingIds(listHtml);
  const indexPage = renderPage(
    "released",
    "Release Notes",
    `All ${SITE_NAME} release notes — changelogs, features, and fixes by version.`,
    `${SITE_NAME.toLowerCase()}, releases, changelog, version history`,
    buildVersionSidebar("", TAGS, TAG_DATES),
    listHtml,
    buildTOC(listHtml),
  );
  fs.writeFileSync(path.join(RELEASED_DIR, "index.html"), indexPage);
  console.log(`OK: ${releaseTags.length} release pages + index`);
}

// === sitemap.xml ===
function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const today = toLocalDateStr(new Date());
function fileLastmod(p, fallback) {
  return fs.existsSync(p) ? toLocalDateStr(fs.statSync(p).mtime) : fallback;
}
let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
sitemap += `  <url><loc>${DOMAIN}/</loc><changefreq>weekly</changefreq><priority>1.0</priority><lastmod>${today}</lastmod></url>\n`;
for (const slug of allSlugs) {
  if (slug === "home") continue;
  const mdPath = path.join(PAGES_DIR, `${slug}.md`);
  if (!fs.existsSync(mdPath)) continue;
  const lastmod = fileLastmod(mdPath, today);
  sitemap += `  <url><loc>${DOMAIN}/${slug}</loc><changefreq>monthly</changefreq><priority>0.6</priority><lastmod>${lastmod}</lastmod></url>\n`;
}
if (zhSlugs.length) {
  sitemap += `  <url><loc>${DOMAIN}/zh/</loc><changefreq>weekly</changefreq><priority>0.9</priority><lastmod>${today}</lastmod></url>\n`;
  for (const slug of zhSlugs) {
    if (slug === "home") continue;
    const lastmod = fileLastmod(path.join(PAGES_DIR, `${slug}.zh.md`), today);
    sitemap += `  <url><loc>${DOMAIN}/zh/${slug}</loc><changefreq>monthly</changefreq><priority>0.5</priority><lastmod>${lastmod}</lastmod></url>\n`;
  }
}
if (releaseTags.length) {
  sitemap += `  <url><loc>${DOMAIN}/released/</loc><changefreq>weekly</changefreq><priority>0.6</priority><lastmod>${today}</lastmod></url>\n`;
  for (let i = 0; i < releaseTags.length; i++) {
    const tag = releaseTags[i];
    const pri = i < 5 ? 0.5 : 0.3; // only recent releases stay worth crawling
    const lastmod = TAG_DATES[tag] || fileLastmod(path.join(TAGS_DIR, `${tag}.md`), today);
    sitemap += `  <url><loc>${DOMAIN}/released/${tag}</loc><changefreq>yearly</changefreq><priority>${pri}</priority><lastmod>${lastmod}</lastmod></url>\n`;
  }
}
sitemap += `</urlset>\n`;
fs.writeFileSync(path.join(__dirname, "public/sitemap.xml"), sitemap);
console.log(`OK: sitemap.xml`);

// === robots.txt ===
const robots = `User-agent: *
Allow: /

Sitemap: ${DOMAIN}/sitemap.xml
`;
fs.writeFileSync(path.join(__dirname, "public/robots.txt"), robots);
console.log("OK: robots.txt");

// === llms.txt ===
const pageUrl = (slug, zh) => `${DOMAIN}${zh ? "/zh" : ""}${slug === "home" ? "/" : `/${slug}`}`;
let llms = `# ${SITE_NAME}\n\n> ${DESCRIPTIONS.home}\n\nMaintained by ${AUTHOR_NAME} (${OWNER})${ORG_NAME ? `, ${ORG_NAME}` : ""}${TAGLINE ? `, ${TAGLINE}` : ""}. Source: https://github.com/${REPO}\n`;
for (const group of NAV) {
  const items = group.items.filter(i => fs.existsSync(path.join(PAGES_DIR, `${i.slug}.md`)));
  if (!items.length) continue;
  llms += `\n## ${group.section}\n\n`;
  for (const item of items) {
    llms += `- [${item.label}](${pageUrl(item.slug, false)}): ${DESCRIPTIONS[item.slug] || item.label}\n`;
  }
}
if (zhSlugs.length) {
  llms += `\n## 中文文件\n\n`;
  for (const slug of zhSlugs) {
    llms += `- [${NAV_ZH_LABEL[slug] || slug}](${pageUrl(slug, true)}): ${DESCRIPTIONS_ZH[slug] || ""}\n`;
  }
}
if (releaseTags.length) {
  llms += `\n## Optional\n\n- [Release Notes](${DOMAIN}/released/): ${SITE_NAME} changelog by version\n`;
}
fs.writeFileSync(path.join(__dirname, "public/llms.txt"), llms);
console.log("OK: llms.txt");

console.log(`\nBuilt ${built} doc pages (${builtZh} zh), ${releaseTags.length} release pages.`);
