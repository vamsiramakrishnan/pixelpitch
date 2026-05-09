'use client';

import type { MouseEvent as ReactMouseEvent } from 'react';
import { useEffect } from 'react';
import { useLayer } from './useLayer';
import { acquireScrollLock } from './scroll-lock';

interface UseModalLayerOptions {
  open: boolean;
  onDismiss: () => void;
  backdropClose?: boolean;
  escapeClose?: boolean;
  scrollLock?: boolean;
}

export function useModalLayer(options: UseModalLayerOptions) {
  const layer = useLayer({
    open: options.open,
    onDismiss: options.onDismiss,
    kind: 'modal',
    escapeClose: options.escapeClose,
    clickOutsideClose: false,
  });

  useEffect(() => {
    if (!options.open || options.scrollLock === false) return;
    return acquireScrollLock();
  }, [options.open, options.scrollLock]);

  return {
    ...layer,
    onBackdropClick: (e: ReactMouseEvent) => {
      if (options.backdropClose === false) return;
      if (e.target === e.currentTarget) {
        options.onDismiss();
      }
    },
  };
}
