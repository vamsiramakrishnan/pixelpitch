"""Write a human-readable report from a slidify harvest JSON payload."""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any


def _counter(clusters: list[dict[str, Any]], key: str) -> Counter[str]:
    counts: Counter[str] = Counter()
    for cluster in clusters:
        value = cluster.get("pipeline_signals", {}).get(key, "")
        if value:
            counts[str(value)] += int(cluster.get("instances", 0))
    return counts


def _actions(clusters: list[dict[str, Any]]) -> Counter[str]:
    counts: Counter[str] = Counter()
    for cluster in clusters:
        instances = int(cluster.get("instances", 0))
        for action in cluster.get("pipeline_signals", {}).get("pipeline_actions", []):
            counts[str(action)] += instances
    return counts


def _top(clusters: list[dict[str, Any]], n: int) -> list[dict[str, Any]]:
    return sorted(
        clusters,
        key=lambda c: (
            c.get("pipeline_signals", {}).get("promotion_score", 0),
            c.get("instances", 0),
        ),
        reverse=True,
    )[:n]


def build_report(payload: dict[str, Any], *, top_n: int) -> str:
    run = payload.get("harvest_run", {})
    clusters = payload.get("clusters", [])
    lines = [
        "# Bench Harvest Report",
        "",
        "This report turns raw harvester clusters into renderer work queues. "
        "The goal is native-first editability without compromising visual "
        "fidelity: every high-value miss should point to a native pattern, "
        "hybrid recipe, brilliant surgical raster effect, or fidelity "
        "regression case.",
        "",
        "## Run",
        "",
        f"- Corpus: `{run.get('corpus_dir', '')}`",
        f"- Timestamp: `{run.get('timestamp', '')}`",
        f"- Decks processed: `{run.get('decks_processed', 0)}`",
        f"- Total unmatched units: `{run.get('total_unmatched', 0)}`",
        f"- Unique signatures: `{run.get('unique_signatures', 0)}`",
        "",
        "## Signal Mix",
        "",
    ]

    signals = payload.get("run_signals", {})
    health = signals.get("health", {})
    telemetry = signals.get("telemetry_totals", {})
    if signals:
        lines.extend([
            "## Run Health",
            "",
            f"- Average native area ratio: `{health.get('avg_native_area_ratio', 0)}`",
            f"- Average pattern coverage: `{health.get('avg_pattern_coverage', 0)}`",
            f"- Unmatched per deck: `{health.get('unmatched_per_deck', 0)}`",
            f"- Quality issues per deck: `{health.get('quality_issues_per_deck', 0)}`",
            f"- Errors: `{health.get('error_count', 0)}`",
            "",
            "## Quality Telemetry",
            "",
            f"- Overflow elements: `{telemetry.get('overflow_elements', 0)}`",
            f"- Coverage gaps: `{telemetry.get('coverage_gaps', 0)}`",
            f"- Exclusivity violations: `{telemetry.get('exclusivity_violations', 0)}`",
            f"- Editability failed decks: `{telemetry.get('editability_failed_decks', 0)}`",
            "",
        ])

    for label, counts in (
        ("Render strategies", _counter(clusters, "render_strategy")),
        ("Editability goals", _counter(clusters, "editability_goal")),
        ("Raster fidelity goals", _counter(clusters, "raster_fidelity_goal")),
        ("Fidelity risk", _counter(clusters, "fidelity_risk")),
        ("Promotion priority", _counter(clusters, "promotion_priority")),
        ("Pipeline actions", _actions(clusters)),
    ):
        lines.append(f"### {label}")
        lines.append("")
        if counts:
            for key, value in counts.most_common():
                lines.append(f"- `{key}`: {value}")
        else:
            lines.append("- No signals emitted.")
        lines.append("")

    lines.extend(["## Top Work Queue", ""])
    for cluster in _top(clusters, top_n):
        signals = cluster.get("pipeline_signals", {})
        actions = ", ".join(signals.get("pipeline_actions", [])) or "none"
        examples = ", ".join(cluster.get("exemplars", [])[:3])
        lines.extend([
            f"### {cluster.get('id')} · {cluster.get('candidate_atom_id', '')}",
            "",
            f"- Instances: `{cluster.get('instances', 0)}`",
            f"- Strategy: `{signals.get('render_strategy', '')}`",
            f"- Editability goal: `{signals.get('editability_goal', '')}`",
            f"- Raster fidelity goal: `{signals.get('raster_fidelity_goal', '')}`",
            f"- Risk: `{signals.get('fidelity_risk', '')}`",
            f"- Priority: `{signals.get('promotion_priority', '')}` "
            f"({signals.get('promotion_score', 0)})",
            f"- Features: `{', '.join(signals.get('visual_features', [])) or 'none'}`",
            f"- Actions: `{actions}`",
            f"- Sources: `{', '.join(cluster.get('source_groups', [])) or '.'}`",
            f"- Examples: `{examples}`",
            "",
        ])

    quality_issues = payload.get("quality_issues", [])
    if quality_issues:
        lines.extend(["## Quality Work Queue", ""])
        for issue in quality_issues[:top_n]:
            actions = ", ".join(issue.get("actions", [])) or "none"
            examples = ", ".join(issue.get("examples", [])[:3])
            lines.extend([
                f"### {issue.get('id', '')}",
                "",
                f"- Kind: `{issue.get('kind', '')}`",
                f"- Title: `{issue.get('title', '')}`",
                f"- Severity: `{issue.get('severity', '')}`",
                f"- Instances: `{issue.get('instances', 0)}`",
                f"- Sources: `{', '.join(issue.get('source_groups', [])) or '.'}`",
                f"- Actions: `{actions}`",
                f"- Examples: `{examples}`",
                "",
            ])

    recommendations = signals.get("recommendations", [])
    if recommendations:
        lines.extend(["## Recommendations", ""])
        for rec in recommendations:
            actions = ", ".join(rec.get("actions", [])) or "none"
            lines.extend([
                f"- `{rec.get('priority', '')}` `{rec.get('area', '')}`: "
                f"{rec.get('title', '')} ({rec.get('why', '')}; actions: {actions})"
            ])
        lines.append("")

    errors = payload.get("errors", [])
    if errors:
        lines.extend(["## Errors", ""])
        for error in errors:
            lines.append(f"- `{error.get('path', '')}`: {error.get('error', '')}")
        lines.append("")

    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", "-o", type=Path, required=True)
    parser.add_argument("--top-n", type=int, default=20)
    args = parser.parse_args()

    payload = json.loads(args.input.read_text(encoding="utf-8"))
    report = build_report(payload, top_n=args.top_n)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(report + "\n", encoding="utf-8")
    print(f"wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
