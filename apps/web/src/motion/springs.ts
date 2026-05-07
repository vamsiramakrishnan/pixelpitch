import type { Transition } from 'framer-motion';

export const springs = {
  snappy: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 30,
    mass: 0.8,
  },
  gentle: {
    type: 'spring' as const,
    stiffness: 260,
    damping: 26,
    mass: 1,
  },
  bouncy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 18,
    mass: 0.6,
  },
} satisfies Record<string, Transition>;
