'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { LayerContext, type LayerEntry, type LayerStackContext } from './LayerContext';

const Z_BASE = 2000;
const Z_STEP = 10;

let nextId = 0;
export function generateLayerId(): string {
  return `layer-${++nextId}`;
}

export function LayerProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<LayerEntry[]>([]);
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const register = useCallback((entry: LayerEntry) => {
    setStack((prev) => [...prev, entry]);
    return () => {
      setStack((prev) => prev.filter((e) => e.id !== entry.id));
    };
  }, []);

  const zIndexFor = useCallback((id: string) => {
    const idx = stackRef.current.findIndex((e) => e.id === id);
    if (idx === -1) return Z_BASE;
    return Z_BASE + (idx + 1) * Z_STEP;
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      const current = stackRef.current;
      if (current.length === 0) return;
      for (let i = current.length - 1; i >= 0; i--) {
        const layer = current[i]!;
        if (layer.escapeClose) {
          e.preventDefault();
          e.stopImmediatePropagation();
          layer.onDismiss();
          return;
        }
      }
    }
    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', onKeyDown, { capture: true });
  }, []);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const current = stackRef.current;
      if (current.length === 0) return;
      const target = e.target as Node;

      for (let i = current.length - 1; i >= 0; i--) {
        const layer = current[i]!;
        const isInside =
          layer.contentRef.current?.contains(target) ||
          layer.insideRefs?.some((ref) => ref.current?.contains(target));
        if (isInside) return;
        if (layer.clickOutsideClose) {
          layer.onDismiss();
          return;
        }
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const value = useMemo<LayerStackContext>(
    () => ({ register, zIndexFor }),
    [register, zIndexFor],
  );

  return <LayerContext.Provider value={value}>{children}</LayerContext.Provider>;
}
