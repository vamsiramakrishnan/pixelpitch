"""CLI: ``python -m slidify.patterns --classify-stdin|--classify-batch``.

Stdin: HTML (single) or NDJSON ``{id, html}`` lines (batch).
Stdout: ``{atom_id, confidence, pattern_id?}`` JSON / NDJSON.
Used by the M5 contract test (CONTRACT-v2 §D).
"""
from __future__ import annotations
import json, re, sys
from slidify.patterns.matcher import get_default_patterns

_RE = re.compile(r'data-atom\s*=\s*"([^"]+)"', re.IGNORECASE)

def _classify(html: str) -> dict:
    m = _RE.search(html or "")
    aid = (m.group(1).strip() if m else "")
    if aid:
        for p in get_default_patterns():
            v = p.match.get("anchor.data_atom_id")
            if v == aid or (isinstance(v, list) and aid in v):
                return {"atom_id": aid, "confidence": float(p.emit.get("confidence", 0.9)), "pattern_id": p.id}
    return {"atom_id": None, "confidence": 0.0}

def main() -> int:
    a = sys.argv[1:]
    if "--classify-stdin" in a:
        r = _classify(sys.stdin.read())
        json.dump(r, sys.stdout); return 0 if r["atom_id"] else 1
    if "--classify-batch" in a:
        for line in sys.stdin:
            if not (line := line.strip()): continue
            req = json.loads(line); res = _classify(req.get("html", "")); res["id"] = req.get("id")
            sys.stdout.write(json.dumps(res) + "\n"); sys.stdout.flush()
        return 0
    print("usage: python -m slidify.patterns [--classify-stdin|--classify-batch]", file=sys.stderr); return 2

if __name__ == "__main__":
    sys.exit(main())
