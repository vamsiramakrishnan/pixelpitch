import { describe, expect, it } from 'vitest';
import { diagramConnectorToIR } from '../DiagramConnector';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('diagramConnectorToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable straight connector with arrow', () => {
    expect(diagramConnectorToIR({
      from: { x: 100, y: 100 },
      to: { x: 400, y: 200 },
    }, tokens)).toMatchSnapshot();
  });

  it('orthogonal mode produces 4 commands (M + 3xL)', () => {
    const ir = diagramConnectorToIR({ from: { x: 0, y: 0 }, to: { x: 100, y: 100 }, kind: 'orthogonal' }, tokens);
    expect(ir.commands.length).toBe(4);
    expect(ir.commands[0]?.op).toBe('M');
  });

  it('curved mode produces M + C', () => {
    const ir = diagramConnectorToIR({ from: { x: 0, y: 0 }, to: { x: 100, y: 100 }, kind: 'curved' }, tokens);
    expect(ir.commands.map(c => c.op)).toEqual(['M', 'C']);
  });

  it('attaches an arrow markerEnd by default', () => {
    const ir = diagramConnectorToIR({ from: { x: 0, y: 0 }, to: { x: 100, y: 0 } }, tokens);
    expect(ir.markerEnd?.kind).toBe('arrow');
  });
});
