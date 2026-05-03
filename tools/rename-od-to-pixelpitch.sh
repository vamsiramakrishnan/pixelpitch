#!/usr/bin/env bash
#
# rename-od-to-pixelpitch.sh
#
# One-shot deterministic rename script. Operates on a staging tree of OD code
# copied from nexu-io/open-design and rewrites identifiers, paths, ports, and
# branding to pixelpitch conventions.
#
# Idempotent: safe to re-run. Skips LICENSE files, NOTICE files,
# THIRD_PARTY_NOTICES.md, CREDITS, the guizang skill markdowns, and itself
# (legal text and the rename script must not be touched).
#
# Usage: tools/rename-od-to-pixelpitch.sh <staging-dir>
#
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <staging-dir>" >&2
  exit 2
fi

STAGE="$1"

if [[ ! -d "$STAGE" ]]; then
  echo "error: $STAGE is not a directory" >&2
  exit 2
fi

echo "renaming under $STAGE ..."

# Files we MUST NOT touch (legal text, upstream attribution, rename script
# itself, this repo's own attribution docs).
PROTECTED_PATTERN='(/LICENSE$|/LICENSE-[A-Z0-9.-]+$|/NOTICE$|/THIRD_PARTY_NOTICES\.md$|/CREDITS\.md$|/skills/guizang-ppt/.*\.md$|/rename-od-to-pixelpitch\.sh$)'

# Build the file list. We touch text-likely extensions only; binaries left alone.
mapfile -t FILES < <(
  find "$STAGE" -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \
    -o -name '*.json' -o -name '*.jsonc' -o -name '*.md' -o -name '*.mdx' \
    -o -name '*.yaml' -o -name '*.yml' -o -name '*.toml' -o -name '*.html' \
    -o -name '*.css' -o -name '*.scss' -o -name '*.txt' -o -name '*.sh' \
    -o -name '*.env*' -o -name '*.config.*' \
    -o -name 'Dockerfile' -o -name 'Makefile' \) \
    | grep -Ev "$PROTECTED_PATTERN" || true
)

echo "  ${#FILES[@]} files to scan"

# In-file substitutions. Order matters: do longest match first so prefixes
# don't shadow longer identifiers.
for f in "${FILES[@]}"; do
  perl -i -pe '
    # npm scope: @open-design/X -> @pixelpitch/X
    s{\@open-design/}{\@pixelpitch/}g;

    # Bare identifiers in code/comments/markdown — but NOT inside the
    # nexu-io/open-design upstream URL (that is a proper-noun attribution).
    # We mask any "nexu-io/open-design" sequence first, do the substitution,
    # then unmask.
    s{nexu-io/open-design}{__PROTECTED_NEXU_OD__}g;
    s/\bopen-design\b/pixelpitch/g;
    s{__PROTECTED_NEXU_OD__}{nexu-io/open-design}g;
    s/\bOpen[ -]?Design\b/Pixelpitch/g;
    s/\bopendesign\b/pixelpitch/g;
    # CamelCase compounds: OpenDesignComponent, OpenDesignSidecarContract, etc.
    s/\bOpenDesign/Pixelpitch/g;
    s/__OpenDesign/__Pixelpitch/g;

    # Filesystem paths: ~/.od/ and project-local .od/
    s{~/\.od/}{~/.pixelpitch/}g;
    s{(?<![A-Za-z0-9_])\.od/}{.pixelpitch/}g;

    # CLI binary "od" subcommand prefix. Bare "od" alone is too risky to
    # globally substitute, so we only handle the safe prefix forms.
    s{(["`'"'"' ])od (--?[a-z])}{$1pixelpitch $2}g;
    s{\bnpx od\b}{npx pixelpitch}g;
    s{\bbunx od\b}{bunx pixelpitch}g;
    s{\bpnpm od\b}{pnpm pixelpitch}g;
    # Indented "od " at line start (usage / help text inside template literals).
    s{^(\s+)od (.+)$}{$1pixelpitch $2}gm;
    # "od " followed by known subcommands anywhere.
    s{\bod (media|chat|projects|skills|design|brief)\b}{pixelpitch $1}g;

    # package.json "bin" map: "od": "./dist/..."
    s{"od":\s*"\./}{"pixelpitch": "./}g;

    # URL scheme + SCREAMING_SNAKE constants (OD_*, OPEN_DESIGN_*).
    s{\bOD_SCHEME\b}{PIXELPITCH_SCHEME}g;
    s{\bOD_([A-Z0-9_]+)\b}{PIXELPITCH_$1}g;
    s{\bOPEN_DESIGN_([A-Z0-9_]+)\b}{PIXELPITCH_$1}g;
    s{\bod://}{pixelpitch://}g;
    s{(SCHEME\s*=\s*)"od"}{$1"pixelpitch"}g;

    # Logger tags [od:...] -> [pixelpitch:...]
    s/\[od:/[pixelpitch:/g;

    # Skill frontmatter namespace.
    s/^od:/pixelpitch:/g;
    s/^(\s\s)od:$/$1pixelpitch:/g;

    # Daemon port. Upstream uses 7456; we use 17456 to coexist with OD.
    s/\b7456\b/17456/g;
    s{(localhost:|127\.0\.0\.1:)7777\b}{${1}17777}g;

    # Vercel project name strings (best-effort).
    s/"open-design"/"pixelpitch"/g;
  ' "$f"
done

echo "  in-file substitutions complete"

# Directory and file renames where the OD identifier appears in the path.
mapfile -t PATHS_TO_RENAME < <(
  find "$STAGE" -depth -name '*open-design*' -o -name '*opendesign*' 2>/dev/null || true
)
for p in "${PATHS_TO_RENAME[@]}"; do
  newp="${p//open-design/pixelpitch}"
  newp="${newp//opendesign/pixelpitch}"
  if [[ "$p" != "$newp" ]]; then
    mv "$p" "$newp"
    echo "  renamed $p -> $newp"
  fi
done

echo "done."
