import { describe, expect, it } from 'vitest';
import { chromeDeviceFrameToIR } from '../ChromeDeviceFrame';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('chromeDeviceFrameToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable phone frame with notch', () => {
    expect(chromeDeviceFrameToIR({
      bbox: { x: 80, y: 80, w: 280, h: 560 },
      device: 'phone',
      screenshotSrc: 'https://example.com/shot.png',
    }, tokens)).toMatchSnapshot();
  });

  it('emits notch on phone but not on laptop', () => {
    const phone = chromeDeviceFrameToIR({ bbox: { x: 0, y: 0, w: 280, h: 560 }, device: 'phone' }, tokens);
    const laptop = chromeDeviceFrameToIR({ bbox: { x: 0, y: 0, w: 800, h: 500 }, device: 'laptop' }, tokens);
    expect(phone.children.find(c => c.recipeId === 'chrome.device-frame.notch')).toBeDefined();
    expect(laptop.children.find(c => c.recipeId === 'chrome.device-frame.notch')).toBeUndefined();
    expect(laptop.children.find(c => c.recipeId === 'chrome.device-frame.base')).toBeDefined();
  });

  it('uses PictureNode when screenshotSrc is set, ShapeNode placeholder otherwise', () => {
    const withSrc = chromeDeviceFrameToIR({ bbox: { x: 0, y: 0, w: 280, h: 560 }, device: 'phone', screenshotSrc: 'a.png' }, tokens);
    const noSrc = chromeDeviceFrameToIR({ bbox: { x: 0, y: 0, w: 280, h: 560 }, device: 'phone' }, tokens);
    const screenA = withSrc.children.find(c => c.recipeId === 'chrome.device-frame.screen');
    const screenB = noSrc.children.find(c => c.recipeId === 'chrome.device-frame.screen');
    expect(screenA?.kind).toBe('picture');
    expect(screenB?.kind).toBe('shape');
  });

  it('stamps recipeId equal to the atom id', () => {
    const ir = chromeDeviceFrameToIR({ bbox: { x: 0, y: 0, w: 200, h: 400 }, device: 'phone' }, tokens);
    expect(ir.recipeId).toBe('chrome.device-frame');
  });
});
