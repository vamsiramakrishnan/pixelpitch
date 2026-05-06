import { describe, expect, it } from 'vitest';
import {
  buildPptxAuditInvocation,
  buildSlidifyConvertInvocation,
} from '../src/pptx-export.js';

describe('pptx export command builders', () => {
  it('uses uv run slidify by default', () => {
    expect(buildSlidifyConvertInvocation('/tmp/deck.html', '/tmp/deck.pptx', '/tmp/report.json', {})).toEqual({
      command: 'uv',
      args: [
        'run',
        'slidify',
        'convert',
        '/tmp/deck.html',
        '/tmp/deck.pptx',
        '--json',
        '--report-json',
        '/tmp/report.json',
      ],
    });
  });

  it('allows a direct slidify binary override', () => {
    expect(
      buildSlidifyConvertInvocation('/tmp/deck.html', '/tmp/deck.pptx', '/tmp/report.json', {
        SLIDIFY_BIN: '/opt/bin/slidify',
      }),
    ).toEqual({
      command: '/opt/bin/slidify',
      args: [
        'convert',
        '/tmp/deck.html',
        '/tmp/deck.pptx',
        '--json',
        '--report-json',
        '/tmp/report.json',
      ],
    });
  });

  it('runs the fidelity audit script through uv by default', () => {
    expect(buildPptxAuditInvocation('/tmp/deck.pptx', '/repo/content/skills', {})).toEqual({
      command: 'uv',
      args: [
        'run',
        'python',
        '/repo/content/skills/pptx-html-fidelity-audit/scripts/verify_layout.py',
        '/tmp/deck.pptx',
      ],
    });
  });
});
