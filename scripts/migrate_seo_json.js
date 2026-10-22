const fs = require("fs");
const path = require("path");

const NAMES = [
  "PERSON_ID", "PERSON_NAME", "PERSON_ALT_NAMES", "SAME_AS",
  "ORG_NAME", "ORG_NAME_ZH", "ORG_SAME_AS", "ORG_ID", "ORG_URL", "TAGLINE",
  "OG_IMAGE", "FAVICON", "HOME_TITLE", "HOME_TITLE_ZH", "PROGRAMMING_LANGUAGE", "LICENSE_URL",
  "AI_TRAIN", "AI_INPUT", "AI_SEARCH", "X_DEFAULT", "BRAND_KEYWORDS",
  "DESCRIPTIONS", "DESCRIPTIONS_ZH", "KEYWORDS", "KEYWORDS_ZH",
];

function literalOf(src, name) {
  const m = new RegExp(`^const ${name} = `, "m").exec(src);
  if (!m) return undefined;
  let i = m.index + m[0].length;
  const start = i;
  let depth = 0;
  let quote = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "/" && src[i + 1] === "/") i = src.indexOf("\n", i) - 1;
    else if ("[{(".includes(c)) depth++;
    else if ("]})".includes(c)) depth--;
    else if (c === ";" && depth === 0) break;
  }
  return new Function(`return (${src.slice(start, i)});`)();
}

function main() {
  const [buildPath, outPath] = process.argv.slice(2);
  if (!buildPath || !outPath) {
    console.error("[Invalid] args: usage node migrate_seo_json.js <old build.js> <seo.json>");
    process.exit(1);
  }
  if (fs.existsSync(outPath)) {
    console.error(`[Conflict] ${outPath}: already exists; /seo-optimize owns it`);
    process.exit(1);
  }
  let src;
  try {
    src = fs.readFileSync(buildPath, "utf-8");
  } catch (e) {
    console.error(`[Not found] ${buildPath}: ${e.message}`);
    process.exit(1);
  }
  const v = {};
  for (const name of NAMES) {
    try {
      v[name] = literalOf(src, name);
    } catch (e) {
      console.error(`[Invalid] ${name}: ${e.message}`);
      process.exit(1);
    }
    if (typeof v[name] === "string" && v[name].startsWith("{{")) v[name] = "";
  }
  const seo = {
    home_title: { en: v.HOME_TITLE || "", zh: v.HOME_TITLE_ZH || "" },
    descriptions: { en: v.DESCRIPTIONS || {}, zh: v.DESCRIPTIONS_ZH || {} },
    keywords: { en: v.KEYWORDS || {}, zh: v.KEYWORDS_ZH || {} },
    brand_keywords: v.BRAND_KEYWORDS || [],
    person: { id: v.PERSON_ID || "", name: v.PERSON_NAME || "", alt_names: v.PERSON_ALT_NAMES || [], same_as: v.SAME_AS || [] },
    organization: { id: v.ORG_ID || "", url: v.ORG_URL || "", name: v.ORG_NAME || "", name_zh: v.ORG_NAME_ZH || "", same_as: v.ORG_SAME_AS || [] },
    tagline: v.TAGLINE || "",
    og_image: v.OG_IMAGE || "",
    favicon: v.FAVICON || "",
    x_default: v.X_DEFAULT || "",
    ai_usage: { train: v.AI_TRAIN || "", input: v.AI_INPUT || "", search: v.AI_SEARCH || "" },
    programming_language: v.PROGRAMMING_LANGUAGE || "",
    license_url: v.LICENSE_URL || "",
  };
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(seo, null, 2) + "\n");
  const missing = NAMES.filter(n => v[n] === undefined);
  console.log(`OK: ${outPath}${missing.length ? ` (absent in old build.js: ${missing.join(", ")})` : ""}`);
}

main();
