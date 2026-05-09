'use client';

import { createContext } from 'react';
import type { RefObject } from 'react';

export type LayerKind = 'modal' | 'popover' | 'menu' | 'lightbox';

export interface LayerEntry {
  id: string;
  kind: LayerKind;
  onDismiss: () => void;
  contentRef: RefObject<HTMLElement | null>;
  insideRefs?: RefObject<HTMLElement | null>[];
  escapeClose: boolean;
  clickOutsideClose: boolean;
}

export interface LayerStackContext {
  register: (entry: LayerEntry) => () => void;
  zIndexFor: (id: string) => number;
}

export const LayerContext = createContext<LayerStackContext | null>(null);
