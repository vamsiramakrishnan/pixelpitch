import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { springs } from '../motion';
import { useModalLayer } from '../layers';

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  backdropClassName?: string;
  modalClassName?: string;
  disableEscapeKey?: boolean;
  disableBackdropClick?: boolean;
}

export function MotionModal({
  open,
  onClose,
  children,
  className,
  backdropClassName = 'modal-backdrop',
  modalClassName = 'modal',
  disableEscapeKey = false,
  disableBackdropClick = false,
}: Props) {
  const layer = useModalLayer({
    open,
    onDismiss: onClose,
    escapeClose: !disableEscapeKey,
    backdropClose: !disableBackdropClick,
  });

  const content = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="backdrop"
          ref={layer.contentRef}
          className={backdropClassName}
          style={{ zIndex: layer.zIndex, animation: 'none' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.16 } }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          onClick={layer.onBackdropClick}
        >
          <motion.div
            className={className ? `${modalClassName} ${className}` : modalClassName}
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: springs.gentle }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
            style={{ animation: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}
