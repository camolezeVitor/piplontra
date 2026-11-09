import { cva } from 'class-variance-authority';

export const drawerVariants = cva(
  'fixed top-0 right-0 h-full w-80 bg-black! shadow-lg transition-transform duration-250 ease-out will-change-transform z-50 border-l border-white',
  {
    variants: {
      open: {
        true: 'translate-x-0',
        false: 'translate-x-full',
      },
    },
    defaultVariants: {
      open: false,
    },
  }
);