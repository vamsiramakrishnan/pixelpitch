"""Build the deck-skill corpus that slidify harvests.

Pulls every deck skill's `example.html` (and any `assets/example*.html`
or template seed) into `_bench/decks-from-skills/` so the harvester
can scan them as a single corpus and rank what slidify currently
rasterizes.

Output layout:
  _bench/decks-from-skills/
    <skill-name>.html
    index.json
    index.html (browsable)

Run via `make harvest-deck-skills` or directly:
  uv run python _bench/scripts/build_skills_corpus.py
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SKILLS = ROOT / "skills"
OUT = ROOT / "_bench" / "decks-from-skills"

DECK_MODE_RE = ('mode: deck', 'mode: "deck"', "mode: 'deck'")


def is_deck_skill(skill_md: Path) -> bool:
    try:
        text = skill_md.read_text(encoding='utf-8')
    except Exception:
        return False
    return any(token in text for token in DECK_MODE_RE)


def best_example(skill_dir: Path) -> Path | None:
    """Pick the best HTML representative of the skill.

    Preference order:
      1. example.html in the skill root
      2. assets/example.html, assets/example-*.html
      3. assets/template.html (if no example exists)
    """
    candidates: list[Path] = []
    root_ex = skill_dir / "example.html"
    if root_ex.exists():
        candidates.append(root_ex)
    assets = skill_dir / "assets"
    if assets.is_dir():
        for p in sorted(assets.glob("example*.html")):
            candidates.append(p)
        if not candidates:
            tpl = assets / "template.html"
            if tpl.exists():
                candidates.append(tpl)
    examples = skill_dir / "examples"
    if examples.is_dir() and not candidates:
        for p in sorted(examples.glob("*.html")):
            candidates.append(p)
            break
    return candidates[0] if candidates else None


def main() -> int:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    rows: list[dict] = []
    for skill_md in sorted(SKILLS.glob("*/SKILL.md")):
        if not is_deck_skill(skill_md):
            continue
        skill_dir = skill_md.parent
        skill_name = skill_dir.name
        sample = best_example(skill_dir)
        if not sample:
            print(f"  (skipped: no html sample) {skill_name}")
            continue
        dst = OUT / f"{skill_name}.html"
        shutil.copy2(sample, dst)
        size = dst.stat().st_size
        rows.append({
            "skill": skill_name,
            "source": str(sample.relative_to(ROOT)),
            "html": dst.name,
            "bytes": size,
        })
        print(f"  {skill_name:40s}  {sample.relative_to(ROOT)}  ({size} B)")

    index_json = OUT / "index.json"
    index_json.write_text(json.dumps({"skills": rows, "count": len(rows)}, indent=2))

    # Tiny browsable index.
    rows_html = "\n".join(
        f"  <li><a href=\"{r['html']}\">{r['skill']}</a> "
        f"<span style=\"color:#888\">— {r['source']} ({r['bytes']} B)</span></li>"
        for r in rows
    )
    (OUT / "index.html").write_text(
        f"""<!doctype html><meta charset=\"utf-8\">
<title>pixelpitch · deck skills corpus</title>
<style>body{{font:14px/1.5 system-ui;margin:40px;max-width:760px}}
li{{margin:.4em 0}}</style>
<h1>Deck skills corpus ({len(rows)} skills)</h1>
<p>Each link opens the HTML sample slidify harvests for that skill.
Run <code>make harvest-deck-skills</code> to produce a fresh signals
report at <code>_bench/reports/harvest/skills-signals.json</code>.</p>
<ul>
{rows_html}
</ul>
"""
    )
    print(f"\nWrote {len(rows)} skill samples to {OUT.relative_to(ROOT)}/")
    print(f"Index: {index_json.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
