# slidify-bootstrap

Single static Rust binary that gives users a one-liner install for slidify
without committing to Docker.

```bash
curl -fsSL https://slidify.sh/install | sh
```

Drops a < 5 MB launcher into `~/.local/bin/slidify`. First run materializes
a private Python 3.11 + slidify + Playwright Chromium under
`~/.local/share/slidify/`. Steady-state invocations exec straight through
to the real CLI — argv, exit codes and JSON output are identical to a
`pip install slidify`.

## Why a launcher, not a full Rust rewrite?

slidify orchestrates two heavy native dependencies that no language can
inline into a static binary:

* **Chromium** (~150 MB compressed) — Playwright drives it as a child
  process. Its own runtime needs `libnss`, `libxkbcommon`, `libgbm`, etc.
* **LibreOffice** (~500 MB) — invoked headlessly for the SSIM oracle.

Even a complete Rust rewrite of the slidify pipeline would still spawn
Chromium and LibreOffice as subprocesses. So the right level for a
"single binary install" abstraction is a **bootstrap launcher** — exactly
the pattern `rustup`, `bun`, and `uv` use.

## Lifecycle

```
$ slidify deck.html out.pptx       # first invocation
slidify: first-run setup → /home/me/.local/share/slidify
[ uv → Python 3.11 → slidify wheel → Playwright Chromium ]
slidify: setup complete.
slidify: hint — run `slidify doctor` to verify system deps
[ runs the conversion ]

$ slidify deck.html out.pptx       # every subsequent invocation
[ runs the conversion immediately — no provisioning ]
```

## Subcommands handled by the bootstrap itself

| Command             | Effect                                                      |
|---------------------|-------------------------------------------------------------|
| `slidify setup`     | Provision the private slidify env (idempotent)              |
| `slidify upgrade`   | Re-provision at the latest version                          |
| `slidify uninstall` | Remove the private slidify env (keeps the launcher binary)  |
| `slidify where`     | Print `$SLIDIFY_HOME`                                       |

Every other argv is forwarded verbatim to the real `slidify` CLI.

## Build

```bash
cargo build --release --target x86_64-unknown-linux-musl
cargo build --release --target aarch64-unknown-linux-musl
cargo build --release --target aarch64-apple-darwin
cargo build --release --target x86_64-apple-darwin
```

CI uploads the four artifacts as
`slidify-{x86_64-unknown-linux-musl,aarch64-apple-darwin,…}` to a GitHub
release; `install.sh` resolves the right one via `uname -s -m`.

## What still requires the OS package manager

`slidify doctor` will flag these if missing — they're not bundled because
they're either too large (LibreOffice) or carry their own runtime
dependencies (Tesseract):

| Dep             | Debian                             | macOS              |
|-----------------|------------------------------------|--------------------|
| LibreOffice     | `apt-get install libreoffice-impress` | `brew install --cask libreoffice` |
| Tesseract       | `apt-get install tesseract-ocr`    | `brew install tesseract`           |
| poppler-utils   | `apt-get install poppler-utils`    | `brew install poppler`             |
| Inter font      | `apt-get install fonts-inter`      | install via Font Book              |

The `--no-oracle` flag bypasses the LibreOffice / Tesseract / poppler
requirement (you keep `convert`, lose the SSIM/OCR fidelity check).
