"""Headless Chromium renderer for individual slides."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from types import TracebackType

import structlog
from playwright.async_api import (
    Browser,
    BrowserContext,
    Page,
    Playwright,
    async_playwright,
)

from slidify.dom_walker import walk
from slidify.exceptions import RenderError
from slidify.geom import SLIDE_H_PX, SLIDE_W_PX
from slidify.models import RenderedSlide

log = structlog.get_logger(__name__)


# Injected before page load: kills animations and pauses video.
ANIM_FREEZE_JS = r"""
(() => {
    try {
        if (window.Chart && window.Chart.defaults && window.Chart.defaults.animation !== undefined) {
            window.Chart.defaults.animation = false;
        }
    } catch (_) {}
    const css = `
        *, *::before, *::after {
            transition-duration: 0s !important;
            transition-delay: 0s !important;
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            animation-iteration-count: 1 !important;
        }`;
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-slidify-anim-freeze', 'true');
    styleEl.textContent = css;
    (document.head || document.documentElement).appendChild(styleEl);
})();
"""


class Renderer:
    """Owns a single Chromium instance; one context+page per render."""

    def __init__(
        self,
        viewport: tuple[int, int] = (SLIDE_W_PX, SLIDE_H_PX),
        timeout_ms: int = 15_000,
        *,
        differential: bool = False,
    ) -> None:
        self.viewport_w, self.viewport_h = viewport
        self.timeout_ms = timeout_ms
        self.differential = differential
        self._pw: Playwright | None = None
        self._browser: Browser | None = None
        self._lock = asyncio.Lock()

    async def __aenter__(self) -> Renderer:
        await self.start()
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        await self.close()

    async def start(self) -> None:
        if self._browser is not None:
            return
        self._pw = await async_playwright().start()
        self._browser = await self._pw.chromium.launch(headless=True)
        log.info("renderer.start", viewport=(self.viewport_w, self.viewport_h))

    async def close(self) -> None:
        if self._browser is not None:
            await self._browser.close()
            self._browser = None
        if self._pw is not None:
            await self._pw.stop()
            self._pw = None

    @asynccontextmanager
    async def _page(self) -> AsyncIterator[tuple[BrowserContext, Page]]:
        if self._browser is None:
            await self.start()
        assert self._browser is not None
        ctx = await self._browser.new_context(
            viewport={"width": self.viewport_w, "height": self.viewport_h},
            device_scale_factor=1,
            # Many CI / container environments terminate TLS at a corporate
            # proxy whose cert chain Chromium doesn't trust. Without this,
            # `<img src="https://…">` references silently fail to load and
            # the ground-truth screenshot diverges from the embedded blip
            # (which httpx happily fetches via the system trust store),
            # tanking SSIM on photo-heavy slides. The renderer is offline-
            # safe — failed loads still yield a valid (text-only) shot.
            ignore_https_errors=True,
        )
        # Inject animation freeze script before any page load.
        await ctx.add_init_script(ANIM_FREEZE_JS)
        page = await ctx.new_page()
        try:
            yield ctx, page
        finally:
            await ctx.close()

    async def render(self, html: str) -> RenderedSlide:
        """Render one slide HTML; return DOM dump + ground-truth PNG."""
        async with self._page() as (_ctx, page):
            try:
                await page.set_content(html, wait_until="load", timeout=self.timeout_ms)
            except Exception as e:
                log.warning("renderer.set_content_failed", error=str(e))
                return RenderedSlide(
                    html=html,
                    elements=[],
                    ground_truth_png=b"",
                    viewport_w=self.viewport_w,
                    viewport_h=self.viewport_h,
                    degraded=True,
                    reason=f"set_content: {e}",
                )

            degraded = False
            reason = ""

            # Wait conditions: networkidle → fonts.ready → 2 rAFs.
            try:
                await page.wait_for_load_state("networkidle", timeout=self.timeout_ms)
            except Exception as e:
                degraded = True
                reason = f"networkidle: {e}"
                log.warning("renderer.networkidle_timeout", error=str(e))

            try:
                await page.evaluate("document.fonts && document.fonts.ready")
            except Exception as e:
                log.warning("renderer.fonts_ready_failed", error=str(e))

            try:
                await page.evaluate(
                    "new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))"
                )
            except Exception as e:
                log.warning("renderer.raf_failed", error=str(e))

            # Ground truth screenshot.
            try:
                png = await page.screenshot(
                    clip={
                        "x": 0,
                        "y": 0,
                        "width": self.viewport_w,
                        "height": self.viewport_h,
                    },
                    full_page=False,
                    type="png",
                )
            except Exception as e:
                raise RenderError(f"screenshot failed: {e}") from e

            # Second pass for differential mode: blank every text node, take a
            # decoration-only screenshot, restore. Layout stays identical so
            # the no-text image is pixel-aligned with the ground truth.
            no_text_png = b""
            if self.differential:
                try:
                    no_text_png = await self._capture_decoration_only(page)
                except Exception as e:
                    log.warning("renderer.differential_failed", error=str(e))

            # DOM walk.
            try:
                elements = await walk(page)
            except Exception as e:
                raise RenderError(f"dom walk failed: {e}") from e

            log.info(
                "renderer.render_ok",
                element_count=len(elements),
                png_bytes=len(png),
                differential=bool(no_text_png),
                degraded=degraded,
            )

            return RenderedSlide(
                html=html,
                elements=elements,
                ground_truth_png=png,
                no_text_png=no_text_png,
                viewport_w=self.viewport_w,
                viewport_h=self.viewport_h,
                degraded=degraded,
                reason=reason,
            )

    async def _capture_decoration_only(self, page: Page) -> bytes:
        """Blank every text node, screenshot, restore. The result is the
        decoration layer (gradients, shapes, borders, shadows) without any
        text pixels — used by the surgical-hybrid emitter for pixel-exact
        backgrounds."""
        # Walks all text nodes, stashes originals on the document, blanks them.
        await page.evaluate(
            r"""() => {
                const stash = [];
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                let n;
                while ((n = walker.nextNode())) {
                    if (!n.nodeValue) continue;
                    stash.push([n, n.nodeValue]);
                    n.nodeValue = '';
                }
                window.__slidify_text_stash = stash;
            }"""
        )
        try:
            png = await page.screenshot(
                clip={
                    "x": 0,
                    "y": 0,
                    "width": self.viewport_w,
                    "height": self.viewport_h,
                },
                full_page=False,
                type="png",
            )
        finally:
            await page.evaluate(
                r"""() => {
                    const stash = window.__slidify_text_stash || [];
                    for (const [n, v] of stash) n.nodeValue = v;
                    window.__slidify_text_stash = null;
                }"""
            )
        return png

    async def screenshot_region(
        self, html: str, selector: str, bbox: tuple[float, float, float, float]
    ) -> bytes:
        """Re-render the slide and screenshot a region. Used by emitter for raster fallback.

        bbox is (x, y, w, h) in viewport pixels.
        """
        async with self._page() as (_ctx, page):
            await page.set_content(html, wait_until="load", timeout=self.timeout_ms)
            try:
                await page.wait_for_load_state("networkidle", timeout=self.timeout_ms)
            except Exception:
                pass
            try:
                await page.evaluate("document.fonts && document.fonts.ready")
            except Exception:
                pass
            try:
                await page.evaluate(
                    "new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))"
                )
            except Exception:
                pass
            x, y, w, h = bbox
            x = max(0.0, x)
            y = max(0.0, y)
            w = max(1.0, min(w, self.viewport_w - x))
            h = max(1.0, min(h, self.viewport_h - y))
            png = await page.screenshot(
                clip={"x": x, "y": y, "width": w, "height": h},
                full_page=False,
                type="png",
            )
            return png
