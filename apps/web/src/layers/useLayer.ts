'use client';

import { useContext, useEffect, useRef } from 'react';
import type { RefObject, MutableRefObject } from 'react';
import { LayerContext, type LayerKind } from './LayerContext';
import { generateLayerId } from './LayerProvider';

interface UseLayerOptions {
  open: boolean;
  onDismiss: () => void;
  kind: LayerKind;
  escapeClose?: boolean;
  clickOutsideClose?: boolean;
  insideRefs?: RefObject<HTMLElement | null>[];
}

interface UseLayerReturn {
  contentRef: MutableRefObject<HTMLDivElement | null>;
  zIndex: number;
  layerId: string;
}

export function useLayer(options: UseLayerOptions): UseLayerReturn {
  const ctx = useContext(LayerContext);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const layerId = useRef(generateLayerId()).current;

  const clickOutsideClose = options.clickOutsideClose ??
    (options.kind === 'popover' || options.kind === 'menu');
  const escapeClose = options.escapeClose ?? true;

  const onDismissRef = useRef(options.onDismiss);
  onDismissRef.current = options.onDismiss;

  const insideRefsRef = useRef(options.insideRefs);
  insideRefsRef.current = options.insideRefs;

  useEffect(() => {
    if (!options.open || !ctx) return;

    const unregister = ctx.register({
      id: layerId,
      kind: options.kind,
      onDismiss: () => onDismissRef.current(),
      contentRef,
      insideRefs: insideRefsRef.current,
      escapeClose,
      clickOutsideClose,
    });

    return unregister;
  }, [options.open, options.kind, escapeClose, clickOutsideClose, layerId, ctx]);

  const zIndex = ctx?.zIndexFor(layerId) ?? Z_FALLBACK;

  return { contentRef, zIndex, layerId };
}

const Z_FALLBACK = 1000;
