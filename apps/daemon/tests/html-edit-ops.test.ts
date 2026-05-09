import { describe, expect, it } from 'vitest';

import {
  applyHtmlEditOperations,
  HtmlEditOperationError,
} from '../src/html-edit-ops.js';

describe('html edit operations', () => {
  it('sets text by stable data-od-id', () => {
    const result = applyHtmlEditOperations(
      '<main><h1 data-od-id="hero-title">Old</h1></main>',
      [{
        type: 'setText',
        target: { fileName: 'index.html', elementId: 'hero-title' },
        text: 'New <Title>',
      }],
    );

    expect(result.source).toContain('<h1 data-od-id="hero-title">New &lt;Title&gt;</h1>');
    expect(result.applied).toHaveLength(1);
  });

  it('sets inline styles by generated selector', () => {
    const result = applyHtmlEditOperations(
      '<section><button class="cta primary" style="color: red">Go</button><button>Next</button></section>',
      [{
        type: 'setStyle',
        target: {
          fileName: 'index.html',
          selector: 'button.cta.primary:nth-of-type(1)',
        },
        styles: {
          color: '#111111',
          backgroundColor: '#eeeeee',
          borderColor: '#cccccc',
          width: null,
        },
      }],
    );

    expect(result.source).toContain('style="color: #111111; background-color: #eeeeee; border-color: #cccccc"');
  });

  it('removes an element by id selector', () => {
    const result = applyHtmlEditOperations(
      '<div><p id="remove-me">Remove</p><p>Keep</p></div>',
      [{
        type: 'removeElement',
        target: { fileName: 'index.html', selector: '#remove-me' },
      }],
    );

    expect(result.source).toBe('<div><p>Keep</p></div>');
  });

  it('targets generated descendants under a stable slide anchor', () => {
    const result = applyHtmlEditOperations(
      '<section data-screen-label="01 Cover"><div><span>First</span><span>Second</span></div></section><section><span>Other</span></section>',
      [{
        type: 'setText',
        target: {
          fileName: 'index.html',
          selector: '[data-screen-label="01 Cover"] div:nth-of-type(1) > span:nth-of-type(2)',
        },
        text: 'Updated',
      }],
    );

    expect(result.source).toContain('<span>First</span><span>Updated</span>');
    expect(result.source).toContain('<section><span>Other</span></section>');
  });

  it('falls back to bridge-generated element ids for unanchored spans', () => {
    const spans = Array.from({ length: 11 }, (_, index) =>
      index === 10 ? '<span>DA</span>' : `<span>${index}</span>`,
    ).join('');
    const result = applyHtmlEditOperations(
      `<section>${spans}</section>`,
      [{
        type: 'setText',
        target: { fileName: 'index.html', elementId: 'span-d-a-11' },
        text: 'Design Architecture',
      }],
    );

    expect(result.source).toContain('<span>Design Architecture</span>');
  });

  it('uses selected text and slide context when generated span indexes drift', () => {
    const result = applyHtmlEditOperations(
      [
        '<section data-screen-label="00 Intro"><span>DA</span></section>',
        '<section data-screen-label="01 Cover"><div><span>XX</span><span>DA</span></div></section>',
        '<section data-screen-label="02 End"><span>DA</span></section>',
      ].join(''),
      [{
        type: 'setText',
        target: {
          fileName: 'index.html',
          elementId: 'span-d-a-11',
          selector: 'span:nth-of-type(11)',
          label: 'span within 01 Cover',
          tagName: 'span',
          currentText: 'DA',
        },
        text: 'Design Architecture',
      }],
    );

    expect(result.source).toContain('<section data-screen-label="00 Intro"><span>DA</span></section>');
    expect(result.source).toContain('<section data-screen-label="01 Cover"><div><span>XX</span><span>Design Architecture</span></div></section>');
    expect(result.source).toContain('<section data-screen-label="02 End"><span>DA</span></section>');
  });

  it('patches JSX slide source selected from an inlined preview', () => {
    const result = applyHtmlEditOperations(
      [
        'const Slide00Cover = () => (',
        '  <section data-screen-label="00 Cover" className="slide-cover">',
        '    <span>AI</span>',
        '    <span>D&amp;A</span>',
        '  </section>',
        ');',
      ].join('\n'),
      [{
        type: 'setText',
        target: {
          fileName: 'index.html',
          elementId: 'span-d-a-11',
          label: 'span within 00 Cover',
          tagName: 'span',
          currentText: 'D&A',
        },
        text: 'Data Architecture',
      }],
    );

    expect(result.source).toContain('<span>Data Architecture</span>');
  });

  it('throws for missing targets', () => {
    expect(() => applyHtmlEditOperations('<p>Text</p>', [{
      type: 'setText',
      target: { fileName: 'index.html', selector: '#missing' },
      text: 'Nope',
    }])).toThrow(HtmlEditOperationError);
  });
});
