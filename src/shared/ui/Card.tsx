import { motion } from 'framer-motion';
import { cardHover } from '../../lib/animations';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({
  children,
  className = '',
  onClick,
  hoverable = false,
}: CardProps) {
  if (hoverable) {
    return (
      <motion.div
        variants={cardHover}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        onClick={onClick}
        className={`
          bg-gradient-to-br from-gray-800 to-gray-900
          border border-gray-700
          rounded-2xl
          p-4
          shadow-xl
          ${onClick ? 'cursor-pointer' : ''}
          ${className}
        `}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`
        bg-gradient-to-br from-gray-800 to-gray-900
        border border-gray-700
        rounded-2xl
        p-4
        shadow-xl
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <motion.div
      className={`bg-gray-700/50 rounded-lg ${className}`}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  className = '',
}: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <motion.div
      className={`${sizes[size]} border-2 border-gray-600 border-t-blue-500 rounded-full ${className}`}
      animate={{
        rotate: 360,
      }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}
