import type { PanelEvent } from '@pixelpitch/contracts/critique';
import { parseV1 } from './parsers/v1.js';

export interface ShipArtifactPayload {
  round: number;
  mime: string;
  body: string;
}

export type ShipArtifactCallback = (payload: ShipArtifactPayload) => void;

export interface ParserOptions {
  runId: string;
  adapter: string;
  parserMaxBlockBytes: number;
  /** Project identity threaded into ship event artifactRef. */
  projectId?: string;
  /** Artifact identity threaded into ship event artifactRef. */
  artifactId?: string;
  /**
   * Side-channel for the potentially large <SHIP><ARTIFACT> body. The
   * parser keeps PanelEvent/SSE payloads small and hands artifact bytes to
   * the orchestrator for persistence before the ship event is emitted.
   */
  onArtifact?: ShipArtifactCallback;
}

export async function* parseCritiqueStream(
  source: AsyncIterable<string>,
  opts: ParserOptions,
): AsyncIterable<PanelEvent> {
  // For v1, the version is detected from <CRITIQUE_RUN version="1"> in the first chunk.
  // Only v1 exists currently so we always dispatch to parsers/v1.
  yield* parseV1(source, opts);
}
