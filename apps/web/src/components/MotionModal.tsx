import { useEffect, useRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { springs } from '../motion';

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
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || disableEscapeKey) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, disableEscapeKey]);

  if (!open) return null;

  return (
    <motion.div
      ref={backdropRef}
      className={backdropClassName}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.16 } }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      onClick={
        disableBackdropClick
          ? undefined
          : (e) => {
              if (e.target === backdropRef.current) onClose();
            }
      }
      style={{ animation: 'none' }}
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
  );
}
