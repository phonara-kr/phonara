import { motion } from 'framer-motion';
import { rewardBurst } from '../../lib/animations';

interface RewardBurstProps {
  amount: number;
  onComplete?: () => void;
}

export function RewardBurst({ amount, onComplete }: RewardBurstProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      <motion.div
        variants={rewardBurst}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          className="text-6xl"
          animate={{
            scale: [0, 1.2, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 0.5,
            ease: 'easeOut',
          }}
        >
          {amount >= 50 ? '🎉' : '⭐'}
        </motion.div>

        <motion.div
          className="text-4xl font-bold text-yellow-400"
          animate={{
            scale: [0.5, 1.3, 1],
          }}
          transition={{
            duration: 0.4,
            delay: 0.1,
          }}
        >
          +{amount} PHON
        </motion.div>

        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full bg-yellow-400"
              style={{
                left: '50%',
                top: '50%',
              }}
              animate={{
                x: [
                  0,
                  (Math.random() - 0.5) * 300,
                ],
                y: [
                  0,
                  (Math.random() - 0.5) * 300,
                ],
                opacity: [1, 0],
                scale: [1, 0],
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.02,
                ease: 'easeOut',
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

interface StreakFireProps {
  streak: number;
}

export function StreakFire({ streak }: StreakFireProps) {
  const fireCount = Math.min(streak, 7);
  const intensity = streak >= 7 ? 'high' : streak >= 5 ? 'medium' : 'low';

  const fireEmojis = ['🔥', '💥', '⚡', '✨'];

  return (
    <div className="relative flex flex-col items-center">
      <motion.div
        className="flex gap-1"
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {Array.from({ length: Math.min(fireCount, 3) }).map((_, i) => (
          <motion.span
            key={i}
            className="text-3xl"
            animate={{
              y: [0, -5, 0],
              rotate: [-5, 5, -5],
            }}
            transition={{
              duration: 0.4,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          >
            {fireEmojis[i % fireEmojis.length]}
          </motion.span>
        ))}
      </motion.div>

      {streak >= 3 && (
        <motion.div
          className="absolute -bottom-2 text-xs font-bold text-orange-400"
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        >
          {streak} Day Streak!
        </motion.div>
      )}
    </div>
  );
}
