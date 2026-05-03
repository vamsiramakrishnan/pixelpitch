#!/usr/bin/env bash
#
# bootstrap.sh — first-run setup for pixelpitch.
#
# Installs JS deps, builds the workspace dependency chain in the correct
# order, optionally bootstraps slidify (the Python HTML→PPTX converter),
# and prints next-step hints. Idempotent: safe to re-run.
#
# Usage: bash tools/bootstrap.sh    (or, once Bun is installed: bun run bootstrap)
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
dim()   { printf '\033[2m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
red()   { printf '\033[31m%s\033[0m\n' "$*" >&2; }

step() { printf '\n'; bold "▶ $*"; }

step "1/5  Checking required runtimes"
if ! command -v bun >/dev/null 2>&1; then
  dim "    Bun not found — installing Bun into ~/.bun"
  if ! command -v curl >/dev/null 2>&1; then
    red "    missing: curl"
    red "Install curl or install Bun manually: https://bun.com/docs/installation"
    exit 1
  fi
  curl -fsSL https://bun.com/install | bash
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    red "    missing: $1"
    return 1
  fi
  printf '    \033[32m✓\033[0m %s  %s\n' "$1" "$($2 2>/dev/null | head -n1)"
}
ok=true
need bun  'bun --version'    || ok=false
need node 'node --version'   || ok=false
if ! $ok; then
  red ""
  red "Install missing tools:"
  red "  Bun:  curl -fsSL https://bun.com/install | bash"
  red "  Node: https://nodejs.org   (>=22 recommended)"
  exit 1
fi

# Optional Python toolchain (only required if you want slidify).
if command -v uv >/dev/null 2>&1; then
  printf '    \033[32m✓\033[0m uv   %s\n' "$(uv --version 2>/dev/null | head -n1)"
  HAVE_UV=1
else
  dim   "    (optional) uv not found — slidify (Python HTML→PPTX) won't be bootstrapped"
  HAVE_UV=0
fi

step "2/5  Installing JS dependencies (bun install)"
bun install --silent

step "3/5  Building workspace dependency chain"
bun run --filter @pixelpitch/platform     build
bun run --filter @pixelpitch/sidecar-proto build
bun run --filter @pixelpitch/sidecar      build
bun run --filter @pixelpitch/tools-dev    build
bun run --filter @pixelpitch/daemon       build

step "4/5  Mirroring skills into .claude/ and .gemini/"
bun tools/skills-sync.ts

step "5/5  Optional: bootstrapping slidify (Python HTML→PPTX)"
if [[ "$HAVE_UV" == "1" ]]; then
  if [[ -x ".venv/bin/python" ]]; then
    dim "    .venv already exists — skipping"
  else
    UV_CACHE_DIR="$ROOT/.uv-cache" UV_PROJECT_ENVIRONMENT="$ROOT/.venv" \
      uv sync --quiet
    green "    slidify env created at .venv (run 'make doctor' to verify Chromium etc.)"
  fi
else
  dim "    skipped (no uv)"
fi

cat <<EOF

$(green "✓ Bootstrap complete.")

Next steps:

  $(bold "bun run dev")            # start daemon + web, watches for changes
  $(bold "make doctor")            # verify slidify external deps (LibreOffice, Chromium, fonts)
  $(bold "open http://localhost:3000")

For deeper docs:
  - $(bold "QUICKSTART.md")        # 5-minute end-to-end walkthrough
  - $(bold "docs/architecture.md") # how the pieces fit together
  - $(bold "README.md") "Built on" # attribution and upstream lineage

EOF
