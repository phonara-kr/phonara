import { Variants, Transition } from 'framer-motion';

export const springConfig: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

export const gentleSpring: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 25,
};

export const bouncySpring: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 20,
};

export const quickSpring: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
};

export const fadeUp: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: springConfig,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.15 },
  },
};

export const fadeIn: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

export const scaleIn: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: springConfig,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.15 },
  },
};

export const slideInRight: Variants = {
  initial: {
    opacity: 0,
    x: 100,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: springConfig,
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: { duration: 0.15 },
  },
};

export const slideInLeft: Variants = {
  initial: {
    opacity: 0,
    x: -100,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: springConfig,
  },
  exit: {
    opacity: 0,
    x: -100,
    transition: { duration: 0.15 },
  },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {},
};

export const staggerItem: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: quickSpring,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.1 },
  },
};

export const rewardBurst: Variants = {
  initial: {
    opacity: 0,
    scale: 0,
    rotate: -180,
  },
  animate: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 15,
    },
  },
  exit: {
    opacity: 0,
    scale: 1.5,
    transition: { duration: 0.3 },
  },
};

export const pulse: Variants = {
  initial: {
    scale: 1,
  },
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const shimmer: Variants = {
  initial: {
    backgroundPosition: '-200% 0',
  },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

export const numberPopVariants: Variants = {
  initial: {
    scale: 1,
  },
  animate: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

export const fireParticle: Variants = {
  initial: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  animate: {
    opacity: 0,
    y: -50,
    scale: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

export const toastSlide: Variants = {
  initial: {
    opacity: 0,
    y: 100,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: quickSpring,
  },
  exit: {
    opacity: 0,
    y: 100,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

export const pageTransition: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

export const cardHover: Variants = {
  initial: {
    y: 0,
  },
  hover: {
    y: -4,
    transition: quickSpring,
  },
  tap: {
    y: 0,
    scale: 0.98,
    transition: { duration: 0.1 },
  },
};

export const buttonTap: Variants = {
  initial: {
    scale: 1,
  },
  tap: {
    scale: 0.95,
    transition: { duration: 0.1 },
  },
};

export const rippleVariant: Variants = {
  initial: {
    scale: 0,
    opacity: 0.5,
  },
  animate: {
    scale: 4,
    opacity: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};
