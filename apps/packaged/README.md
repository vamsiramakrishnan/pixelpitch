# apps/packaged

Thin packaged Electron runtime entry for Pixelpitch.

This package starts the packaged daemon and web sidecars, registers the `pixelpitch://`
entry protocol, and then delegates to `@pixelpitch/desktop/main` for the host
window. Product logic stays in `apps/daemon`, `apps/web`, and `apps/desktop`.
