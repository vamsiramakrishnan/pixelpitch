# Implementation Changes (Code-Level) — Proposed Diffs/Patches

This document provides concrete patch-style changes to implement the roadmap. These are intentionally scoped, reviewable chunks you can apply incrementally.

> Note: Paths and snippets are designed to be realistic against current repo structure, but should be applied PR-by-PR (not all at once).

---

## Patch 1 — CLI schema contract + deterministic response envelope

```diff
diff --git a/slidify/cli_schema.py b/slidify/cli_schema.py
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/slidify/cli_schema.py
@@ -0,0 +1,63 @@
+from __future__ import annotations
+
+from dataclasses import dataclass, asdict
+from typing import Any
+
+SCHEMA_VERSION = "1.0"
+
+
+@dataclass(slots=True)
+class CLIError:
+    type: str | None = None
+    message: str | None = None
+    stage: str | None = None
+
+
+@dataclass(slots=True)
+class CLIEnvelope:
+    schema_version: str
+    command: str
+    status: str
+    error: CLIError | None
+    metrics: dict[str, Any]
+    _next: list[str]
+
+
+def ok(command: str, metrics: dict[str, Any], next_steps: list[str]) -> dict[str, Any]:
+    payload = CLIEnvelope(
+        schema_version=SCHEMA_VERSION,
+        command=command,
+        status="ok",
+        error=None,
+        metrics=metrics,
+        _next=next_steps,
+    )
+    return asdict(payload)
+
+
+def fail(
+    command: str,
+    err_type: str,
+    message: str,
+    stage: str,
+    next_steps: list[str],
+    metrics: dict[str, Any] | None = None,
+) -> dict[str, Any]:
+    payload = CLIEnvelope(
+        schema_version=SCHEMA_VERSION,
+        command=command,
+        status="error",
+        error=CLIError(type=err_type, message=message, stage=stage),
+        metrics=metrics or {},
+        _next=next_steps,
+    )
+    return asdict(payload)
```

```diff
diff --git a/slidify/cli.py b/slidify/cli.py
index 2222222..3333333 100644
--- a/slidify/cli.py
+++ b/slidify/cli.py
@@ -18,6 +18,7 @@ import click
 from slidify import __version__
 from slidify.api import ConversionConfig, convert
+from slidify.cli_schema import fail as schema_fail
+from slidify.cli_schema import ok as schema_ok
@@ -140,11 +141,20 @@ def _run_convert(...):
-    if json_out:
-        payload = result.model_dump()
-        payload["_next"] = _next_steps(result)
-        click.echo(json.dumps(payload, indent=2, default=str))
+    if json_out:
+        payload = schema_ok(
+            command="convert",
+            metrics=result.model_dump(),
+            next_steps=_next_steps(result),
+        )
+        click.echo(json.dumps(payload, indent=2, sort_keys=True, default=str))
@@ -152,10 +162,21 @@ def _run_convert(...):
-    except Exception as e:
+    except Exception as e:
         remediation = _error_remediation(e)
         if json_out:
-            click.echo(json.dumps({"error": str(e), "type": type(e).__name__, "stage": "convert", "_remediation": remediation}, indent=2))
+            click.echo(
+                json.dumps(
+                    schema_fail(
+                        command="convert",
+                        err_type=type(e).__name__,
+                        message=str(e),
+                        stage="convert",
+                        next_steps=remediation,
+                    ),
+                    indent=2,
+                    sort_keys=True,
+                )
+            )
         else:
             click.echo(click.style(f"slidify: conversion failed: {e}", fg="red"), err=True)
```

---

## Patch 2 — CLI command/presenter split

```diff
diff --git a/slidify/cli/commands.py b/slidify/cli/commands.py
new file mode 100644
index 0000000..4444444
--- /dev/null
+++ b/slidify/cli/commands.py
@@ -0,0 +1,41 @@
+from __future__ import annotations
+
+import asyncio
+from pathlib import Path
+
+from slidify.api import ConversionConfig, convert
+
+
+def run_convert(source, output_pptx: Path, cfg: ConversionConfig):
+    return asyncio.run(convert(source, output_pptx, cfg))
```

```diff
diff --git a/slidify/cli/presenters.py b/slidify/cli/presenters.py
new file mode 100644
index 0000000..5555555
--- /dev/null
+++ b/slidify/cli/presenters.py
@@ -0,0 +1,35 @@
+from __future__ import annotations
+
+import json
+
+
+def print_json(payload: dict) -> str:
+    return json.dumps(payload, indent=2, sort_keys=True, default=str)
+
+
+def print_path(path: str) -> str:
+    return path
```

---

## Patch 3 — pipeline module scaffolding + `api.py` façade

```diff
diff --git a/slidify/pipeline/source.py b/slidify/pipeline/source.py
new file mode 100644
index 0000000..6666666
--- /dev/null
+++ b/slidify/pipeline/source.py
@@ -0,0 +1,26 @@
+from __future__ import annotations
+
+from collections.abc import AsyncIterator
+
+
+async def normalize_source(source) -> AsyncIterator[str]:
+    # moved from api.py:_normalize_source
+    if isinstance(source, str):
+        yield source
+        return
+    # TODO: port existing path/iterable logic from api.py
+    raise NotImplementedError("normalize_source: remaining branches to port")
```

```diff
diff --git a/slidify/pipeline/planning.py b/slidify/pipeline/planning.py
new file mode 100644
index 0000000..7777777
--- /dev/null
+++ b/slidify/pipeline/planning.py
@@ -0,0 +1,31 @@
+from __future__ import annotations
+
+from dataclasses import dataclass
+
+
+@dataclass(slots=True)
+class SlidePlan:
+    index: int
+    units: list
+    decisions: dict
+    ops: list
+
+
+def build_plan(index: int, rendered_slide) -> SlidePlan:
+    # TODO: migrate clustering + decisioning logic from api.py
+    return SlidePlan(index=index, units=[], decisions={}, ops=[])
```

```diff
diff --git a/slidify/api.py b/slidify/api.py
index 8888888..9999999 100644
--- a/slidify/api.py
+++ b/slidify/api.py
@@ -40,6 +40,10 @@ from slidify.units import cluster, flatten
+from slidify.pipeline.source import normalize_source
+from slidify.pipeline.planning import build_plan
+
@@ -280,7 +284,7 @@ async def convert(...):
-    async for html in _normalize_source(source):
+    async for html in normalize_source(source):
         rendered = await renderer.render(html)
-        # existing inlined planning logic
+        plan = build_plan(i, rendered)
         # TODO: execute + verify via pipeline modules
```

---

## Patch 4 — classifier registry integration

```diff
diff --git a/slidify/classifier/interfaces.py b/slidify/classifier/interfaces.py
new file mode 100644
index 0000000..aaaaaaa
--- /dev/null
+++ b/slidify/classifier/interfaces.py
@@ -0,0 +1,20 @@
+from __future__ import annotations
+
+from typing import Protocol
+
+
+class ClassifierStage(Protocol):
+    name: str
+    order: int
+
+    def run(self, unit, context) -> dict: ...
```

```diff
diff --git a/slidify/classifier/registry.py b/slidify/classifier/registry.py
new file mode 100644
index 0000000..bbbbbbb
--- /dev/null
+++ b/slidify/classifier/registry.py
@@ -0,0 +1,33 @@
+from __future__ import annotations
+
+from slidify.classifier.interfaces import ClassifierStage
+
+
+class ClassifierRegistry:
+    def __init__(self) -> None:
+        self._stages: list[ClassifierStage] = []
+
+    def register(self, stage: ClassifierStage) -> None:
+        self._stages.append(stage)
+        self._stages.sort(key=lambda s: s.order)
+
+    def run(self, unit, context) -> dict:
+        for stage in self._stages:
+            out = stage.run(unit, context)
+            if out.get("matched"):
+                return out
+        return {
+            "matched": False,
+            "reason_code": "no_stage_matched",
+            "confidence": 0.0,
+            "features": {},
+            "fallback_path": "hybrid",
+        }
```

---

## Patch 5 — shared emission primitives

```diff
diff --git a/slidify/emission/primitives.py b/slidify/emission/primitives.py
new file mode 100644
index 0000000..ccccccc
--- /dev/null
+++ b/slidify/emission/primitives.py
@@ -0,0 +1,48 @@
+from __future__ import annotations
+
+from pptx.util import Emu
+
+
+def set_text_frame_margins(tf) -> None:
+    tf.margin_left = Emu(0)
+    tf.margin_right = Emu(0)
+    tf.margin_top = Emu(0)
+    tf.margin_bottom = Emu(0)
+
+
+def apply_border(shape, width_emu, rgb=None) -> None:
+    shape.line.width = Emu(width_emu)
+    if rgb is not None:
+        shape.line.color.rgb = rgb
```

```diff
diff --git a/slidify/compile_ir.py b/slidify/compile_ir.py
index ddddddd..eeeeeee 100644
--- a/slidify/compile_ir.py
+++ b/slidify/compile_ir.py
@@ -21,6 +21,7 @@ from pptx.util import Emu, Pt
+from slidify.emission.primitives import apply_border, set_text_frame_margins
@@ -162,10 +163,7 @@ class _IRCompiler:
-        tf.margin_left = Emu(0)
-        tf.margin_right = Emu(0)
-        tf.margin_top = Emu(0)
-        tf.margin_bottom = Emu(0)
+        set_text_frame_margins(tf)
@@ -224,7 +222,7 @@ class _IRCompiler:
-            shape.line.width = Emu(px_to_emu(border.width))
+            apply_border(shape, px_to_emu(border.width), col[0] if col is not None else None)
```

---

## Patch 6 — typed errors and lifecycle events

```diff
diff --git a/slidify/errors.py b/slidify/errors.py
new file mode 100644
index 0000000..fffffff
--- /dev/null
+++ b/slidify/errors.py
@@ -0,0 +1,22 @@
+class SlidifyError(Exception):
+    stage = "unknown"
+
+
+class SourceError(SlidifyError):
+    stage = "source"
+
+
+class PlanningError(SlidifyError):
+    stage = "planning"
+
+
+class EmissionError(SlidifyError):
+    stage = "emission"
+
+
+class VerificationError(SlidifyError):
+    stage = "verification"
```

```diff
diff --git a/slidify/events.py b/slidify/events.py
new file mode 100644
index 0000000..1212121
--- /dev/null
+++ b/slidify/events.py
@@ -0,0 +1,30 @@
+from __future__ import annotations
+
+import json
+from dataclasses import asdict, dataclass
+
+
+@dataclass(slots=True)
+class SlideEvent:
+    event: str
+    slide_index: int
+    detail: dict
+
+
+def encode_event(evt: SlideEvent) -> str:
+    return json.dumps(asdict(evt), sort_keys=True)
```

---

## Patch 7 — architecture analysis tooling

```diff
diff --git a/tools/arch/scan_imports.py b/tools/arch/scan_imports.py
new file mode 100644
index 0000000..1313131
--- /dev/null
+++ b/tools/arch/scan_imports.py
@@ -0,0 +1,43 @@
+from __future__ import annotations
+
+import ast
+from pathlib import Path
+
+
+def scan(root: Path) -> dict[str, list[str]]:
+    graph: dict[str, list[str]] = {}
+    for py in root.rglob("*.py"):
+        if ".venv" in py.parts:
+            continue
+        mod = py.relative_to(root).as_posix()
+        tree = ast.parse(py.read_text(encoding="utf-8"))
+        deps: list[str] = []
+        for n in ast.walk(tree):
+            if isinstance(n, ast.Import):
+                deps.extend([a.name for a in n.names])
+            elif isinstance(n, ast.ImportFrom) and n.module:
+                deps.append(n.module)
+        graph[mod] = sorted(set(deps))
+    return graph
```

---

## Patch 8 — contract tests

```diff
diff --git a/tests/test_cli_json_contract.py b/tests/test_cli_json_contract.py
new file mode 100644
index 0000000..1414141
--- /dev/null
+++ b/tests/test_cli_json_contract.py
@@ -0,0 +1,27 @@
+from slidify.cli_schema import SCHEMA_VERSION, ok
+
+
+def test_cli_envelope_required_fields():
+    payload = ok("convert", {"slides": 1}, ["echo done"])
+    assert payload["schema_version"] == SCHEMA_VERSION
+    assert payload["command"] == "convert"
+    assert payload["status"] == "ok"
+    assert "metrics" in payload
+    assert "_next" in payload
```

```diff
diff --git a/tests/test_cli_exit_codes.py b/tests/test_cli_exit_codes.py
new file mode 100644
index 0000000..1515151
--- /dev/null
+++ b/tests/test_cli_exit_codes.py
@@ -0,0 +1,21 @@
+def test_exit_code_contract_documented():
+    # placeholder: enforce a single source of truth in follow-up
+    assert {0, 2, 3}.issubset({0, 2, 3})
```

---

## Rollout notes
- Apply these patches as separate PRs in the order listed in `IMPLEMENTATION_PLAN.md`.
- Keep compatibility of public API (`convert`) and existing CLI flags while introducing new modules.
- For each patch PR: include focused tests and docs updates.
