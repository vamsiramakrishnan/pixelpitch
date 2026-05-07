import type { Variants } from 'framer-motion';
import { springs } from './springs';

export const variants = {
  fadeUp: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: springs.gentle },
    exit: { opacity: 0, y: 4, transition: { duration: 0.12 } },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.16 } },
    exit: { opacity: 0, transition: { duration: 0.1 } },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1, transition: springs.gentle },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.12 } },
  },
  popoverIn: {
    initial: { opacity: 0, y: -4, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: springs.snappy },
    exit: { opacity: 0, y: -2, scale: 0.98, transition: { duration: 0.1 } },
  },
  staggerParent: {
    initial: {},
    animate: { transition: { staggerChildren: 0.04 } },
    exit: {},
  },
  staggerParentFast: {
    initial: {},
    animate: { transition: { staggerChildren: 0.03 } },
    exit: {},
  },
} satisfies Record<string, Variants>;
