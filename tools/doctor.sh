#!/usr/bin/env bash
#
# doctor.sh — environment health check for pixelpitch.
#
# Reports what's installed, what version, and what's missing. No mutations.
#
# Usage: bun run doctor          (or: bash tools/doctor.sh)
#
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OK="\033[32m✓\033[0m"
WARN="\033[33m⚠\033[0m"
FAIL="\033[31m✗\033[0m"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
section() { printf '\n'; bold "$*"; }

check() {
  # check <label> <command-to-run> <required: 0|1>
  local label="$1"; shift
  local req="$1"; shift
  if out="$("$@" 2>&1)"; then
    printf "  %b %-16s %s\n" "$OK" "$label" "$(echo "$out" | head -n1)"
    return 0
  else
    if [[ "$req" == "1" ]]; then
      printf "  %b %-16s missing (required)\n" "$FAIL" "$label"
    else
      printf "  %b %-16s missing (optional)\n" "$WARN" "$label"
    fi
    return 1
  fi
}

section "Runtimes"
check "bun"      1 bun --version
check "node"     1 node --version
check "git"      1 git --version
check "uv"       0 uv --version

section "Pixelpitch web/daemon build artifacts"
test -f apps/daemon/dist/cli.js \
  && printf "  %b %-32s\n" "$OK" "apps/daemon/dist/cli.js" \
  || printf "  %b %-32s — run: bun run build:packages\n" "$WARN" "apps/daemon/dist/cli.js"
test -d apps/web/.next \
  && printf "  %b %-32s\n" "$OK" "apps/web/.next" \
  || printf "  %b %-32s — run: bun run dev\n" "$WARN" "apps/web/.next"

section "Slidify (Python HTML→PPTX)"
test -x .venv/bin/python \
  && printf "  %b %-32s\n" "$OK" ".venv/bin/python" \
  || printf "  %b %-32s — run: ./setup.sh (needs uv)\n" "$WARN" ".venv/bin/python"
check "libreoffice" 0 libreoffice --version
check "tesseract"   0 tesseract --version
check "pdftoppm"    0 pdftoppm -v

section "Code-agent CLIs (the daemon will pick whichever you have)"
for cli in claude codex gemini cursor-agent copilot devin opencode qwen hermes kimi pi kiro mistral; do
  if command -v "$cli" >/dev/null 2>&1; then
    printf "  %b %-16s %s\n" "$OK" "$cli" "$($cli --version 2>&1 | head -n1)"
  else
    printf "  %b %-16s not on PATH\n" "$WARN" "$cli"
  fi
done

section "Skills"
n_canonical=$(find content/skills -mindepth 1 -maxdepth 1 -type d | wc -l)
n_claude=$(find .claude/skills -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
n_gemini=$(find .gemini/skills -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
printf "  %b content/skills/     %s skills\n" "$OK" "$n_canonical"
printf "  %b .claude/skills/     %s skills\n" "$OK" "$n_claude"
printf "  %b .gemini/skills/     %s skills\n" "$OK" "$n_gemini"

section "Ports"
for p in 17456 17777 3000; do
  if lsof -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then
    printf "  %b port %-5s listening (in use)\n" "$WARN" "$p"
  else
    printf "  %b port %-5s free\n" "$OK" "$p"
  fi
done

printf "\nFor remediation, see %s.\n" "QUICKSTART.md"
