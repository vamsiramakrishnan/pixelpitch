#!/usr/bin/env bash
# Build a self-contained slidify binary.
#
# Modes:
#   ./packaging/build-binary.sh              # ELF only (no Chromium / OS deps)
#   ./packaging/build-binary.sh --with-chromium
#                                            # ELF + Playwright Chromium tarball
#   ./packaging/build-binary.sh --with-deps  # ELF + .deb tarball of system deps
#
# Output goes under `dist/`:
#   dist/slidify                 (always — the ELF)
#   dist/slidify-chromium.tar.gz (with --with-chromium)
#   dist/slidify-bundle.tar.gz   (with --with-deps)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WITH_CHROMIUM=0
WITH_DEPS=0
for arg in "$@"; do
    case "$arg" in
        --with-chromium) WITH_CHROMIUM=1 ;;
        --with-deps)     WITH_DEPS=1 ;;
        -h|--help)
            head -n 14 "$0" | sed 's/^# *//'
            exit 0 ;;
        *)
            echo "build-binary.sh: unknown flag: $arg" >&2
            exit 2 ;;
    esac
done

echo "==> Ensuring uv environment is current"
uv sync --extra dev

echo "==> Ensuring PyInstaller is installed"
uv pip install --quiet pyinstaller

echo "==> Building ELF"
rm -rf build dist
uv run pyinstaller packaging/slidify.spec --clean --noconfirm
test -x dist/slidify

echo "==> Smoke-testing the binary"
./dist/slidify version
./dist/slidify manifest --brief > /dev/null
./dist/slidify guide > /dev/null

if [[ "$WITH_CHROMIUM" -eq 1 ]]; then
    echo "==> Bundling Playwright Chromium"
    uv run playwright install chromium
    BROWSERS_DIR="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
    if [[ ! -d "$BROWSERS_DIR" ]]; then
        echo "Chromium dir not found at $BROWSERS_DIR" >&2
        exit 1
    fi
    tar -C "$BROWSERS_DIR" -czf dist/slidify-chromium.tar.gz .
    echo "Wrote dist/slidify-chromium.tar.gz ($(du -h dist/slidify-chromium.tar.gz | cut -f1))"
fi

if [[ "$WITH_DEPS" -eq 1 ]]; then
    if ! command -v apt-get >/dev/null; then
        echo "--with-deps only supported on Debian/Ubuntu hosts." >&2
        exit 1
    fi
    echo "==> Downloading .deb files for system dependencies"
    DEPS_DIR="$(mktemp -d)"
    pushd "$DEPS_DIR" >/dev/null
    apt-get download \
        libreoffice-impress libreoffice-core \
        tesseract-ocr poppler-utils \
        fonts-inter fonts-liberation
    popd >/dev/null

    BUNDLE_DIR="$(mktemp -d)"
    cp dist/slidify "$BUNDLE_DIR/"
    cp -r "$DEPS_DIR" "$BUNDLE_DIR/deps"
    cat > "$BUNDLE_DIR/install.sh" <<'INSTALL_EOF'
#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
sudo dpkg -i "$HERE"/deps/*.deb || sudo apt-get install -fy
sudo install -m 0755 "$HERE/slidify" /usr/local/bin/slidify
echo "Installed slidify to /usr/local/bin/slidify"
slidify doctor
INSTALL_EOF
    chmod +x "$BUNDLE_DIR/install.sh"
    tar -C "$BUNDLE_DIR" -czf dist/slidify-bundle.tar.gz .
    rm -rf "$BUNDLE_DIR" "$DEPS_DIR"
    echo "Wrote dist/slidify-bundle.tar.gz ($(du -h dist/slidify-bundle.tar.gz | cut -f1))"
fi

echo
echo "Done."
echo "  dist/slidify ($(du -h dist/slidify | cut -f1))"
echo "Run \`./dist/slidify doctor\` to verify the host environment."
