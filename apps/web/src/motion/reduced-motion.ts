import { useReducedMotion } from 'framer-motion';
import type { Variants, Transition } from 'framer-motion';

export { useReducedMotion };

export const instantTransition: Transition = { duration: 0 };

export function safeTransition(
  transition: Transition,
  prefersReduced: boolean,
): Transition {
  return prefersReduced ? instantTransition : transition;
}

export const skipVariants: Variants = {
  initial: { opacity: 1 },
  animate: { opacity: 1, transition: instantTransition },
  exit: { opacity: 0, transition: instantTransition },
};
