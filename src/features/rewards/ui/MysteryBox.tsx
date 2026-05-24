// Mystery Box - Suspenseful opening animation
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, Star as Stars, Zap } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';

interface MysteryBoxProps {
  boxId: string;
  tier: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  rewardAmount?: number;
  isOpened: boolean;
  onOpened?: () => void;
}

export function MysteryBox({ boxId, tier, rewardAmount, isOpened, onOpened }: MysteryBoxProps) {
  const { user } = useAuthStore();
  const [isOpening, setIsOpening] = useState(false);
  const [revealedReward, setRevealedReward] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleOpen = async () => {
    if (!user || isOpening || isOpened) return;

    setIsOpening(true);

    try {
      const { data, error } = await supabase.rpc('open_mystery_box', {
        p_user_id: user.id,
        p_box_id: boxId,
      });

      if (error) throw error;

      if (data?.success) {
        setRevealedReward(data.reward);

        // Trigger reveal animation sequence
        setTimeout(() => setShowResult(true), 2000);
        setTimeout(() => {
          setShowResult(false);
          setIsOpening(false);
          onOpened?.();
        }, 4000);
      }
    } catch (error) {
      console.error('Error opening box:', error);
      setIsOpening(false);
    }
  };

  const tierColors = {
    'COMMON': 'from-gray-500 to-gray-600',
    'RARE': 'from-blue-500 to-indigo-600',
    'EPIC': 'from-purple-500 to-violet-600',
    'LEGENDARY': 'from-yellow-500 to-orange-600',
  };

  const tierGlow = {
    'COMMON': 'shadow-gray-500/30',
    'RARE': 'shadow-blue-500/30',
    'EPIC': 'shadow-purple-500/30',
    'LEGENDARY': 'shadow-yellow-500/50',
  };

  return (
    <div className="relative">
      {/* Box */}
      <motion.div
        className={`relative w-32 h-32 bg-gradient-to-br ${
          isOpened ? 'from-gray-800 to-gray-900' : tierColors[tier]
        } rounded-2xl shadow-xl ${
          isOpened ? '' : tierGlow[tier]
        } flex items-center justify-center overflow-hidden`}
        animate={isOpening ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.5, delay: 1 }}
      >
        {/* Shine effect */}
        {!isOpened && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          />
        )}

        {/* Box icon */}
        <Gift className={`w-12 h-12 ${isOpened ? 'text-gray-600' : 'text-white'}`} />

        {/* Tier badge */}
        {!isOpened && (
          <div className="absolute bottom-2 left-0 right-0 text-center">
            <span className="text-xs text-white/80 font-semibold">{tier}</span>
          </div>
        )}
      </motion.div>

      {/* Opening animation */}
      <AnimatePresence>
        {isOpening && !showResult && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Particle effects */}
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                }}
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1.5, 0],
                  x: Math.cos((i * 30) * Math.PI / 180) * 80,
                  y: Math.sin((i * 30) * Math.PI / 180) * 80,
                }}
                transition={{ duration: 1, delay: 0.5 + i * 0.05 }}
              >
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result reveal */}
      <AnimatePresence>
        {showResult && revealedReward !== null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative bg-gradient-to-br from-gray-900 to-gray-950 border-2 border-yellow-500 rounded-3xl px-12 py-16 shadow-2xl"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              {/* Celebration particles */}
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-2xl"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [-20, -80],
                    opacity: [1, 0],
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 2,
                    delay: Math.random() * 1,
                  }}
                >
                  +
                </motion.div>
              ))}

              <div className="text-center">
                <motion.div
                  className="mb-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <Stars className="w-16 h-16 text-yellow-400 mx-auto" />
                </motion.div>

                <motion.div
                  className="mb-2"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="text-5xl font-bold text-yellow-400">{revealedReward.toFixed(2)}</span>
                  <span className="text-2xl text-white ml-2">PHON</span>
                </motion.div>

                <motion.p
                  className="text-gray-400"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {tier} Reward!
                </motion.p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Open button */}
      {!isOpened && !isOpening && (
        <motion.button
          onClick={handleOpen}
          className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 rounded-2xl transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Zap className="w-6 h-6 text-white" />
        </motion.button>
      )}
    </div>
  );
}
