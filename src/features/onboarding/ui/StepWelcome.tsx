// Step 1: Welcome + Reward Animation
// Instant emotional payoff with 100 PHON welcome bonus
import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Gift, Sparkles } from 'lucide-react';

interface StepWelcomeProps {
  onNext: () => void;
}

export function StepWelcome({ onNext }: StepWelcomeProps) {
  const [showReward, setShowReward] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const springValue = useSpring(0, { stiffness: 100, damping: 15 });
  const displayValue = useTransform(springValue, (v) => v.toFixed(0));

  useEffect(() => {
    // Trigger reward animation after short delay
    setTimeout(() => setShowReward(true), 800);
  }, []);

  useEffect(() => {
    if (showReward) {
      // Animate reward counter
      springValue.set(100);
      setTimeout(() => setRewardClaimed(true), 1500);
    }
  }, [showReward, springValue]);

  return (
    <div className="text-center">
      {/* Logo */}
      <motion.div
        className="mb-12"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl shadow-2xl shadow-blue-500/40">
          <span className="text-white text-6xl font-bold">P</span>
        </div>
      </motion.div>

      {/* Welcome text */}
      <motion.h1
        className="text-4xl font-bold text-white mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Welcome to PHONARA
      </motion.h1>

      <motion.p
        className="text-gray-400 text-lg mb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Your journey to epic rewards starts here
      </motion.p>

      {/* Reward animation */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            className="mb-12"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <div className="inline-flex flex-col items-center gap-4 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-3xl px-12 py-8">
              <div className="flex items-center gap-3">
                <Gift className="w-12 h-12 text-yellow-400" />
                <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
              </div>

              <div className="text-white">
                <motion.span
                  className="text-6xl font-bold text-yellow-400"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  <motion.span>{displayValue}</motion.span>
                </motion.span>
                <span className="text-2xl ml-2">PHON</span>
              </div>

              <p className="text-gray-300 text-sm">Welcome Bonus!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating coins effect */}
      {showReward && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-2xl"
              initial={{
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 100,
                opacity: 0,
              }}
              animate={{
                y: -100,
                opacity: [0, 1, 1, 0],
                rotate: Math.random() * 360,
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 1,
              }}
            >
              +
            </motion.div>
          ))}
        </div>
      )}

      {/* Continue button */}
      <motion.button
        onClick={onNext}
        className="px-12 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-lg font-semibold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all disabled:opacity-50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: rewardClaimed ? 1 : 0, y: rewardClaimed ? 0 : 20 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={!rewardClaimed}
      >
        Continue
      </motion.button>
    </div>
  );
}
