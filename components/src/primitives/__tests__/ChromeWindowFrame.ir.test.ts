import { describe, expect, it } from 'vitest';
import { chromeWindowFrameToIR } from '../ChromeWindowFrame';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('chromeWindowFrameToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable mac browser frame', () => {
    expect(chromeWindowFrameToIR({
      bbox: { x: 80, y: 80, w: 880, h: 480 },
      chrome: 'mac',
      url: 'https://linear.app',
    }, tokens)).toMatchSnapshot();
  });

  it('renders 3 traffic lights for mac chrome', () => {
    const ir = chromeWindowFrameToIR({ bbox: { x: 0, y: 0, w: 600, h: 400 }, chrome: 'mac', url: 'x' }, tokens);
    const dots = ir.children.filter(c => c.recipeId.startsWith('chrome.window-frame.dot-'));
    expect(dots.length).toBe(3);
  });

  it('omits URL on terminal chrome', () => {
    const ir = chromeWindowFrameToIR({ bbox: { x: 0, y: 0, w: 600, h: 400 }, chrome: 'terminal', url: 'should-not-render', body: '$ pwd' }, tokens);
    const url = ir.children.find(c => c.recipeId === 'chrome.window-frame.url');
    expect(url).toBeUndefined();
  });

  it('stamps recipeId equal to the atom id', () => {
    const ir = chromeWindowFrameToIR({ bbox: { x: 0, y: 0, w: 100, h: 100 }, chrome: 'minimal' }, tokens);
    expect(ir.recipeId).toBe('chrome.window-frame');
  });
});
