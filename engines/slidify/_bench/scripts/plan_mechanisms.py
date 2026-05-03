"""Compose harvest reports into a ranked renderer improvement plan."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from slidify.harvester.mechanisms import mechanisms_to_dict, top_mechanisms


def build_report(payload: dict[str, Any]) -> str:
    mechanisms = payload.get("mechanisms", [])
    lines = [
        "# Bench Mechanisms Plan",
        "",
        "This plan ranks the mechanisms that should improve slide-deck visual fidelity, "
        "native editability, and repeatable pipeline signal quality.",
        "",
        "## Top 10",
        "",
    ]
    for index, mechanism in enumerate(mechanisms, start=1):
        evidence = "; ".join(mechanism.get("evidence", [])[:4]) or "baseline mechanism"
        actions = ", ".join(mechanism.get("actions", [])) or "none"
        gates = ", ".join(mechanism.get("gates", [])) or "none"
        lines.extend([
            f"### {index}. {mechanism.get('title', '')}",
            "",
            f"- Priority: `{mechanism.get('priority', '')}`",
            f"- Area: `{mechanism.get('area', '')}`",
            f"- Score: `{mechanism.get('score', 0)}`",
            f"- Why: {mechanism.get('why', '')}",
            f"- Evidence: {evidence}",
            f"- Actions: `{actions}`",
            f"- Gate: `{gates}`",
            "",
        ])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument("--output", "-o", type=Path, required=True)
    parser.add_argument("--report", "-r", type=Path, required=True)
    parser.add_argument("--top-n", type=int, default=10)
    args = parser.parse_args()

    harvests = [json.loads(path.read_text(encoding="utf-8")) for path in args.inputs]
    payload = mechanisms_to_dict(top_mechanisms(harvests, limit=args.top_n))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(build_report(payload) + "\n", encoding="utf-8")
    print(f"wrote {args.output}")
    print(f"wrote {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
