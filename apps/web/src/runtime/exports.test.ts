import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  archiveFilenameFrom,
  archiveRootFromFilePath,
  buildDesignHandoffContent,
  buildDesignManifestContent,
  exportAsMd,
} from './exports';

function mockResponse(headers: Record<string, string>): Response {
  return { headers: new Headers(headers) } as Response;
}

describe('archiveRootFromFilePath', () => {
  it('returns the top-level directory name when present', () => {
    expect(archiveRootFromFilePath('ui-design/index.html')).toBe('ui-design');
    expect(archiveRootFromFilePath('ui-design/src/app.css')).toBe('ui-design');
  });

  it('returns empty for files at the project root', () => {
    expect(archiveRootFromFilePath('index.html')).toBe('');
    expect(archiveRootFromFilePath('README.md')).toBe('');
  });

  it('strips a leading slash before scanning', () => {
    expect(archiveRootFromFilePath('/ui-design/index.html')).toBe('ui-design');
    expect(archiveRootFromFilePath('//ui-design/index.html')).toBe('ui-design');
  });

  it('returns empty for empty/garbage input', () => {
    expect(archiveRootFromFilePath('')).toBe('');
    expect(archiveRootFromFilePath('/')).toBe('');
  });
});

describe('archiveFilenameFrom', () => {
  it('decodes the RFC 5987 UTF-8 filename* form (preserves multi-byte chars)', () => {
    // 'café-design.zip' encoded — the é is a 2-byte UTF-8 sequence (%C3%A9),
    // which is enough to fail under naive ASCII-only handling.
    const resp = mockResponse({
      'content-disposition':
        "attachment; filename=\"project.zip\"; filename*=UTF-8''caf%C3%A9-design.zip",
    });
    expect(archiveFilenameFrom(resp, 'fallback', 'ui-design')).toBe('café-design.zip');
  });

  it('falls back to the legacy quoted filename= when filename* is absent', () => {
    const resp = mockResponse({
      'content-disposition': 'attachment; filename="ui-design.zip"',
    });
    expect(archiveFilenameFrom(resp, 'fallback', 'ui-design')).toBe('ui-design.zip');
  });

  it('falls back to the active root slug when the header is missing', () => {
    const resp = mockResponse({});
    expect(archiveFilenameFrom(resp, 'fallback-title', 'ui-design')).toBe('ui-design.zip');
  });

  it('falls back to the title slug when both header and root are absent', () => {
    const resp = mockResponse({});
    expect(archiveFilenameFrom(resp, 'My Artifact', '')).toBe('My-Artifact.zip');
  });

  it('falls through to the slug when filename* is malformed', () => {
    // Truncated percent-escape — decodeURIComponent throws; we should not
    // surface the exception, just fall back to the next strategy.
    const resp = mockResponse({
      'content-disposition': "attachment; filename*=UTF-8''%E9%9D",
    });
    expect(archiveFilenameFrom(resp, 'fallback', 'ui-design')).toBe('ui-design.zip');
  });
});

describe('design handoff exports', () => {
  it('builds a screen-file-first manifest with responsive viewports', () => {
    const manifest = JSON.parse(buildDesignManifestContent({
      title: 'Launch UI',
      entryFile: 'frames/browser-chrome.html',
      files: [
        'frames/browser-chrome.html',
        'index.html',
        'landing.html',
        'src/app.css',
        'src/app.tsx',
        'assets/logo.png',
      ],
    }));

    expect(manifest.schema).toBe('open-design.design-manifest.v1');
    expect(manifest.title).toBe('Launch UI');
    expect(manifest.entryFile).toBe('index.html');
    expect(manifest.sourceFiles.css).toEqual(['src/app.css']);
    expect(manifest.sourceFiles.scriptsAndComponents).toEqual(['src/app.tsx']);
    expect(manifest.sourceFiles.assets).toEqual(['assets/logo.png']);
    expect(manifest.screens.map((screen: { file: string }) => screen.file)).toEqual([
      'index.html',
      'landing.html',
    ]);
    expect(manifest.screens[0].role).toBe('launcher-overview');
    expect(manifest.responsiveViewports).toContainEqual(
      expect.objectContaining({ name: 'mobile-standard', width: 390, height: 844 }),
    );
  });

  it('builds a handoff that references the manifest and excludes Pixelpitch chrome', () => {
    const handoff = buildDesignHandoffContent({
      title: 'Launch UI',
      entryFile: 'index.html',
      files: ['index.html', 'src/app.css'],
    });

    expect(handoff).toContain('# Launch UI implementation handoff');
    expect(handoff).toContain('DESIGN-MANIFEST.json');
    expect(handoff).toContain('Pixelpitch chrome');
    expect(handoff).toContain('360x800');
    expect(handoff).toContain('src/app.css');
  });
});

// `exportAsMd` is a pass-through (the file body is the artifact source
// verbatim, only the extension and Content-Type flip). Tests exercise it
// end-to-end by stubbing the few DOM globals `triggerDownload` touches —
// we run under `environment: 'node'`, so `document` and `URL` aren't
// available by default. See issue #279.
describe('exportAsMd', () => {
  let capturedBlob: Blob | undefined;
  let capturedFilename: string | undefined;

  beforeEach(() => {
    capturedBlob = undefined;
    capturedFilename = undefined;
    vi.stubGlobal('URL', {
      createObjectURL: (blob: Blob) => {
        capturedBlob = blob;
        return 'blob:test';
      },
      revokeObjectURL: () => {},
    });
    vi.stubGlobal('document', {
      createElement: () => {
        const anchor = { href: '', click: () => {} } as { href: string; download?: string; click: () => void };
        Object.defineProperty(anchor, 'download', {
          set(value: string) {
            capturedFilename = value;
          },
          get() {
            return capturedFilename ?? '';
          },
        });
        return anchor;
      },
      body: { appendChild: () => {}, removeChild: () => {} },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('downloads the source bytes verbatim under a `.md` extension', async () => {
    const source = '<!doctype html>\n<html lang="en"><body>hi</body></html>\n';

    exportAsMd(source, 'TTC — Seed Round · 2026');

    expect(capturedBlob).toBeDefined();
    expect(capturedBlob!.type).toBe('text/markdown;charset=utf-8');
    // Critical: no transformation, no normalization, no trimming. Whatever
    // the Source view shows is what lands in the .md.
    expect(await capturedBlob!.text()).toBe(source);
    expect(capturedFilename).toBe('TTC-Seed-Round-2026.md');
  });

  it('falls back to "artifact.md" when the title is empty or unsafe', () => {
    exportAsMd('hello', '');
    expect(capturedFilename).toBe('artifact.md');

    exportAsMd('hello', '???');
    expect(capturedFilename).toBe('artifact.md');
  });

  it('keeps multi-byte content (UTF-8) intact end-to-end', async () => {
    const source = '# 中文标题\n\n这是 markdown 文件 — でも本当は HTML 源代码 (مرحبا)。\n';

    exportAsMd(source, 'mixed');

    expect(await capturedBlob!.text()).toBe(source);
  });
});
