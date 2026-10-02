#!/usr/bin/env python3
import json
import re
import subprocess
import sys
from pathlib import Path

SKIP_PARTS = {"cmd", "internal", "testdata", "vendor", "examples", "example"}
IDENT_IN_TICKS = re.compile(r"`([^`\n]+)`")
EXPORTED_TOKEN = re.compile(r"(?<![\w-])([A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*)(?![\w-])")
REMOVED_MARK = re.compile(r"Removed in|移除於")


def run(cmd: list[str], cwd: Path) -> str:
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd)}: {result.stderr.strip()}")
    return result.stdout


def go_symbols(root: Path) -> list[dict]:
    module = run(["go", "list", "-m"], root).strip()
    symbols = []
    for line in run(["go", "list", "-f", "{{.ImportPath}} {{.Name}}", "./..."], root).splitlines():
        import_path, name = line.split(" ", 1)
        rel = import_path[len(module):].lstrip("/") or "."
        if name == "main" or SKIP_PARTS & set(rel.split("/")):
            continue
        doc = run(["go", "doc", "-all", import_path], root)
        in_block = False
        for raw in doc.splitlines():
            if re.match(r"^(const|var) \($", raw):
                in_block = True
                continue
            if in_block:
                if raw == ")":
                    in_block = False
                elif m := re.match(r"^\t([A-Z]\w*)\b", raw):
                    symbols.append({"package": rel, "name": m.group(1), "kind": "const-or-var", "signature": raw.strip()})
                continue
            if m := re.match(r"^func \((\w+ )?\*?(\w+)\) ([A-Z]\w*)\(", raw):
                symbols.append({"package": rel, "name": m.group(3), "kind": "method", "receiver": m.group(2), "signature": raw})
            elif m := re.match(r"^func ([A-Z]\w*)", raw):
                symbols.append({"package": rel, "name": m.group(1), "kind": "func", "signature": raw})
            elif m := re.match(r"^type ([A-Z]\w*)", raw):
                symbols.append({"package": rel, "name": m.group(1), "kind": "type", "signature": raw})
            elif m := re.match(r"^(const|var) ([A-Z]\w*)", raw):
                symbols.append({"package": rel, "name": m.group(2), "kind": m.group(1), "signature": raw})
    seen = set()
    unique = []
    for s in symbols:
        key = (s["package"], s.get("receiver"), s["name"])
        if key not in seen:
            seen.add(key)
            unique.append(s)
    return unique


GO_DECL = re.compile(r"^(?:func (?:\((?:\w+ )?\*?(\w+)(?:\[[^\]]*\])?\) )?([A-Z]\w*)|type ([A-Z]\w*)|(?:const|var) ([A-Z]\w*))")


def go_static_symbols(root: Path, rev: str | None) -> set[tuple[str, str, str]]:
    pattern = r"^(func|type|const|var)|^\t[A-Z]|^\)"
    cmd = ["git", "grep", "-n", "-E", pattern, rev, "--", "*.go"] if rev else ["git", "grep", "--untracked", "-n", "-E", pattern, "--", "*.go"]
    out = subprocess.run(cmd, cwd=root, capture_output=True, text=True).stdout
    found = set()
    in_block: dict[str, bool] = {}
    for line in out.splitlines():
        if rev:
            line = line[len(rev) + 1:]
        path, _, rest = line.split(":", 2)
        if path.endswith("_test.go"):
            continue
        rel = str(Path(path).parent)
        if SKIP_PARTS & set(rel.split("/")):
            continue
        if re.match(r"^(const|var) \($", rest):
            in_block[path] = True
            continue
        if in_block.get(path):
            if rest == ")":
                in_block[path] = False
            elif m := re.match(r"^\t([A-Z]\w*)\b", rest):
                found.add((rel, "", m.group(1)))
            continue
        if m := GO_DECL.match(rest):
            receiver, func, typ, val = m.groups()
            name = func or typ or val
            if name:
                found.add((rel, receiver or "", name))
    return found


def go_history_removals(root: Path) -> list[dict]:
    tags = subprocess.run(["git", "tag", "--sort=version:refname"], cwd=root, capture_output=True, text=True).stdout.split()
    if not tags:
        return []
    head = go_static_symbols(root, None)
    revs = tags + [None]
    removed = {}
    prev = go_static_symbols(root, tags[0])
    for i in range(1, len(revs)):
        cur = head if revs[i] is None else go_static_symbols(root, revs[i])
        for key in prev - cur:
            if key not in head:
                removed[key] = {"removed_in": revs[i] or f"unreleased (after {tags[-1]})", "last_seen": revs[i - 1]}
        prev = cur
    return [{"package": k[0], "receiver": k[1], "name": k[2], **v} for k, v in sorted(removed.items())]


def analyzer_symbols(root: Path) -> list[dict]:
    script = Path(__file__).with_name("analyze_project.py")
    data = json.loads(run([sys.executable, str(script), str(root)], root))
    symbols = []
    for f in data.get("functions", []):
        if f.get("exported"):
            symbols.append({"package": str(Path(f["file"]).parent), "name": f["name"], "kind": "func", "signature": f.get("signature", "")})
    for t in data.get("types", []):
        symbols.append({"package": str(Path(t["file"]).parent), "name": t["name"], "kind": t.get("kind", "type"), "signature": ""})
    return symbols


def package_mentioned(rel: str, docs: str, module_path: str) -> bool:
    if rel == ".":
        return True
    pattern = rf"(?<![\w/.-]){re.escape(rel)}(?![\w/-])"
    full = rf"{re.escape(module_path + '/' + rel)}(?![\w/-])" if module_path else None
    return bool(re.search(pattern, docs) or (full and re.search(full, docs)))


def is_covered(sym: dict, docs: str, module_path: str) -> bool:
    name = sym["name"]
    pkg_short = sym["package"].rsplit("/", 1)[-1]
    if re.search(rf"(?<!\w){re.escape(pkg_short)}\.{re.escape(name)}(?!\w)", docs):
        return True
    if not re.search(rf"(?<![\w-]){re.escape(name)}(?![\w-])", docs):
        return False
    return package_mentioned(sym["package"], docs, module_path)


def doc_identifiers(pages: list[Path]) -> dict[str, set[str]]:
    found: dict[str, set[str]] = {}
    for page in pages:
        for line in page.read_text(encoding="utf-8").splitlines():
            if REMOVED_MARK.search(line):
                continue
            for span in IDENT_IN_TICKS.findall(line):
                for token in EXPORTED_TOKEN.findall(span):
                    found.setdefault(token, set()).add(page.name)
    return found


def code_words(root: Path, ext: str) -> set[str]:
    words = set()
    for f in root.rglob(f"*{ext}"):
        if any(p in {"node_modules", ".git", "vendor", "wiki-worker"} for p in f.parts):
            continue
        words.update(re.findall(r"[A-Za-z_]\w*", f.read_text(encoding="utf-8", errors="ignore")))
    return words


def removal_version(root: Path, name: str, ext: str) -> dict:
    log = subprocess.run(["git", "log", f"-S{name}", "--format=%H%x09%cs", "--", f"*{ext}"], cwd=root, capture_output=True, text=True).stdout.split("\n")
    log = [l for l in log if l]
    if not log:
        return {"removed_in": None, "commit": None, "note": "never existed in git history"}
    commit, date = log[0].split("\t")
    tags = subprocess.run(["git", "tag", "--contains", commit, "--sort=version:refname"], cwd=root, capture_output=True, text=True).stdout.split()
    if tags:
        return {"removed_in": tags[0], "commit": commit[:7], "date": date}
    all_tags = subprocess.run(["git", "tag", "--sort=version:refname"], cwd=root, capture_output=True, text=True).stdout.split()
    latest = all_tags[-1] if all_tags else ""
    return {"removed_in": None, "commit": commit[:7], "date": date, "note": f"unreleased (after {latest or 'no tag'})"}


def main() -> int:
    args = sys.argv[1:]
    write_symbols = None
    if "--write-symbols" in args:
        i = args.index("--write-symbols")
        if i + 1 >= len(args):
            print("--write-symbols needs a path", file=sys.stderr)
            return 2
        write_symbols = Path(args[i + 1]).resolve()
        del args[i:i + 2]
    if not args:
        print("usage: check_coverage.py <project_root> [pages_dir] [--write-symbols <path>]", file=sys.stderr)
        return 2
    root = Path(args[0]).resolve()
    pages_dir = Path(args[1]).resolve() if len(args) > 1 else root / "wiki-worker/public/docs/pages"
    pages = sorted(p for p in pages_dir.glob("*.md") if not p.name.endswith(".zh.md"))
    if not pages:
        print(f"no pages under {pages_dir}", file=sys.stderr)
        return 2
    docs = "\n".join(p.read_text(encoding="utf-8") for p in pages)

    is_go = (root / "go.mod").exists()
    module_path = run(["go", "list", "-m"], root).strip() if is_go else ""
    symbols = go_symbols(root) if is_go else analyzer_symbols(root)
    ext = ".go" if is_go else (".py" if (root / "pyproject.toml").exists() else ".ts" if (root / "tsconfig.json").exists() else ".js")

    missing = [s for s in symbols if not is_covered(s, docs, module_path)]

    if write_symbols:
        index = [{"package": s["package"], "name": s["name"], "kind": s["kind"]} for s in symbols if s["kind"] != "method"]
        write_symbols.parent.mkdir(parents=True, exist_ok=True)
        write_symbols.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    words = code_words(root, ext)
    removed = []
    for token, where in sorted(doc_identifiers(pages).items()):
        if token in words:
            continue
        info = removal_version(root, token, ext)
        removed.append({"name": token, "pages": sorted(where), **info})

    removed_lines = "\n".join(l for p in pages for l in p.read_text(encoding="utf-8").splitlines() if REMOVED_MARK.search(l))
    history = go_history_removals(root) if is_go else []
    undocumented_removals = [h for h in history if not re.search(rf"(?<![\w-]){re.escape(h['name'])}(?![\w-])", removed_lines)]

    print(json.dumps({"symbols": len(symbols), "missing": missing, "removed": removed, "undocumented_removals": undocumented_removals}, ensure_ascii=False, indent=2))
    return 1 if missing or removed or undocumented_removals else 0


if __name__ == "__main__":
    sys.exit(main())
