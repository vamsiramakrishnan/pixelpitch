'use client';

import type { RefObject } from 'react';
import { useLayer } from './useLayer';

interface UsePopoverLayerOptions {
  open: boolean;
  onDismiss: () => void;
  triggerRef?: RefObject<HTMLElement | null>;
  insideRefs?: RefObject<HTMLElement | null>[];
  escapeClose?: boolean;
}

export function usePopoverLayer(options: UsePopoverLayerOptions) {
  const allInsideRefs: RefObject<HTMLElement | null>[] = [];
  if (options.triggerRef) allInsideRefs.push(options.triggerRef);
  if (options.insideRefs) allInsideRefs.push(...options.insideRefs);

  return useLayer({
    open: options.open,
    onDismiss: options.onDismiss,
    kind: 'popover',
    escapeClose: options.escapeClose,
    clickOutsideClose: true,
    insideRefs: allInsideRefs.length > 0 ? allInsideRefs : undefined,
  });
}
