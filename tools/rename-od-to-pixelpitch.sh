#!/usr/bin/env bash
#
# rename-od-to-pixelpitch.sh
#
# One-shot deterministic rename script. Operates on a staging tree of OD code
# copied from nexu-io/open-design and rewrites identifiers, paths, ports, and
# branding to pixelpitch conventions.
#
# Idempotent: safe to re-run. Skips LICENSE files and THIRD_PARTY_NOTICES.md
# (legal text must not be touched).
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

# Files we MUST NOT touch (legal text, upstream attribution).
PROTECTED_PATTERN='(/LICENSE$|/LICENSE-[A-Z0-9.-]+$|/NOTICE$|/THIRD_PARTY_NOTICES\.md$|/CREDITS\.md$|/skills/guizang-ppt/.*\.md$)'

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
#
# We use perl for cross-platform regex semantics. Each substitution is a
# single -pe pass to keep the script readable.
for f in "${FILES[@]}"; do
  perl -i -pe '
    # npm scope: @open-design/X -> @pixelpitch/X
    s{\@open-design/}{\@pixelpitch/}g;

    # Workspace package keys ("name": "@pixelpitch/..." already handled by above).

    # Bare identifiers in code/comments/markdown.
    s/\bopen-design\b/pixelpitch/g;
    s/\bOpen[ -]?Design\b/Pixelpitch/g;
    s/\bopendesign\b/pixelpitch/g;
    # CamelCase compounds: OpenDesignComponent, OpenDesignSidecarContract, etc.
    # Match without trailing word boundary so OpenDesignFoo -> PixelpitchFoo.
    s/\bOpenDesign/Pixelpitch/g;
    # snake/kebab compounds in identifiers
    s/__OpenDesign/__Pixelpitch/g;

    # Filesystem and DB paths. ".od/" appears as project-local dotdir,
    # "~/.od/" as home dotdir. Be specific to avoid breaking unrelated tokens.
    s{~/\.od/}{~/.pixelpitch/}g;
    s{(?<![A-Za-z0-9_])\.od/}{.pixelpitch/}g;

    # CLI binary name. "od " (with trailing space) when it appears as a shell
    # subcommand prefix. "od" alone is too risky to globally substitute, so we
    # only handle the common command-prefix forms.
    s{(["`'"'"' ])od (--?[a-z])}{$1pixelpitch $2}g;
    s{\bnpx od\b}{npx pixelpitch}g;
    s{\bbunx od\b}{bunx pixelpitch}g;
    s{\bpnpm od\b}{pnpm pixelpitch}g;
    # Indented "od " at line start (usage / help text inside template literals).
    s{^(\s+)od (.+)$}{$1pixelpitch $2}gm;
    # "od " followed by "media|chat|projects|skills" subcommands anywhere.
    s{\bod (media|chat|projects|skills|design|brief)\b}{pixelpitch $1}g;

    # package.json "bin" map: "od": "./dist/..."
    s{"od":\s*"\./}{"pixelpitch": "./}g;

    # URL scheme "od" -> "pixelpitch"
    s{\bOD_SCHEME\b}{PIXELPITCH_SCHEME}g;
    s{\bOD_([A-Z0-9_]+)\b}{PIXELPITCH_$1}g;
    s{\bod://}{pixelpitch://}g;
    # The literal scheme value "od" assigned to a *_SCHEME constant.
    s{(SCHEME\s*=\s*)"od"}{$1"pixelpitch"}g;

    # Logger tags [od:...] -> [pixelpitch:...]
    s/\[od:/[pixelpitch:/g;

    # Skill frontmatter namespace. Leading "od:" at column 0 of a YAML doc.
    s/^od:/pixelpitch:/g;
    # Nested under another key (one level of indent).
    s/^(\s\s)od:$/$1pixelpitch:/g;

    # Daemon port. Multica/OD use 7456; we use 17456 to coexist.
    s/\b7456\b/17456/g;
    # OD also uses 7777 in places for legacy preview; leave alone unless paired
    # with localhost in the same line.
    s{(localhost:|127\.0\.0\.1:)7777\b}{${1}17777}g;

    # Vercel project name strings (best-effort).
    s/"open-design"/"pixelpitch"/g;
  ' "$f"
done

echo "  in-file substitutions complete"

# Filename + directory renames. We only need to rename when the OD identifier
# appears in the path. There are very few such paths in practice.
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
