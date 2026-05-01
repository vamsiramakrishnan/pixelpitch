#!/usr/bin/env sh
# slidify — single-binary installer.
#
#     curl -fsSL https://slidify.sh/install | sh
#
# Detects platform, downloads the matching slidify-bootstrap binary,
# drops it into ~/.local/bin/slidify, and runs `slidify setup`. From
# then on, `slidify` works just like the pip-installed CLI.
#
# Honors:
#   SLIDIFY_INSTALL_DIR   — override install directory (default ~/.local/bin)
#   SLIDIFY_BOOTSTRAP_VER — pin a bootstrap binary version
#   SLIDIFY_NO_SETUP=1    — install the launcher only, skip env provisioning

set -eu

REPO_BASE="${SLIDIFY_REPO_BASE:-https://github.com/vamsiramakrishnan/pixelpitch/releases}"
VERSION="${SLIDIFY_BOOTSTRAP_VER:-latest}"
INSTALL_DIR="${SLIDIFY_INSTALL_DIR:-$HOME/.local/bin}"

uname_s="$(uname -s)"
uname_m="$(uname -m)"
case "$uname_s-$uname_m" in
    Linux-x86_64)   target="x86_64-unknown-linux-musl" ;;
    Linux-aarch64)  target="aarch64-unknown-linux-musl" ;;
    Darwin-arm64)   target="aarch64-apple-darwin" ;;
    Darwin-x86_64)  target="x86_64-apple-darwin" ;;
    *)
        echo "slidify-install: unsupported platform $uname_s-$uname_m" >&2
        exit 2 ;;
esac

case "$VERSION" in
    latest) url="$REPO_BASE/latest/download/slidify-$target" ;;
    *)      url="$REPO_BASE/download/$VERSION/slidify-$target" ;;
esac

mkdir -p "$INSTALL_DIR"
echo "Downloading $url ..."
if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$INSTALL_DIR/slidify"
elif command -v wget >/dev/null 2>&1; then
    wget -qO "$INSTALL_DIR/slidify" "$url"
else
    echo "slidify-install: need curl or wget" >&2
    exit 2
fi
chmod +x "$INSTALL_DIR/slidify"

case ":$PATH:" in
    *":$INSTALL_DIR:"*) ;;
    *) echo
       echo "Note: $INSTALL_DIR is not on your PATH."
       echo "Add it: echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> ~/.profile"
       ;;
esac

if [ "${SLIDIFY_NO_SETUP:-}" != "1" ]; then
    echo "Provisioning slidify environment ..."
    "$INSTALL_DIR/slidify" setup
fi

echo
echo "Installed: $INSTALL_DIR/slidify"
echo "Try:       slidify doctor"
