// Daily Claim Button - Server-authoritative claim action
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Flame, Sparkles } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { useWalletStore } from '../../../stores/walletStore';

interface DailyClaimButtonProps {
  canClaimToday: boolean;
  streakDays: number;
  onClaimed: () => void;
}

export function DailyClaimButton({ canClaimToday, streakDays, onClaimed }: DailyClaimButtonProps) {
  const { user } = useAuthStore();
  const { addBalance } = useWalletStore();
  const [isClaiming, setIsClaiming] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);

  const handleClaim = async () => {
    if (!user || isClaiming || !canClaimToday) return;

    setIsClaiming(true);

    try {
      const { data, error } = await supabase.rpc('claim_daily_reward', {
        p_user_id: user.id,
      });

      if (error) throw error;

      if (data?.success) {
        setRewardAmount(data.reward_amount);
        addBalance(data.reward_amount);
        setShowReward(true);

        setTimeout(() => {
          setShowReward(false);
          onClaimed();
        }, 2000);
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  const calculateReward = () => {
    const nextStreak = streakDays + 1;
    const amount = 10 + (Math.min(nextStreak, 6) - 1) * 5;
    return nextStreak % 7 === 0 ? amount * 2 : amount;
  };

  return (
    <div className="relative">
      <motion.button
        onClick={handleClaim}
        disabled={!canClaimToday || isClaiming}
        className={`relative w-full h-32 rounded-2xl overflow-hidden transition-all ${
          canClaimToday && !isClaiming
            ? 'bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 shadow-xl shadow-orange-500/40'
            : 'bg-gray-800 cursor-not-allowed'
        }`}
        whileHover={canClaimToday && !isClaiming ? { scale: 1.02 } : {}}
        whileTap={canClaimToday && !isClaiming ? { scale: 0.98 } : {}}
      >
        {/* Animated flame background */}
        {canClaimToday && !isClaiming && (
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 opacity-30"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Flame
                className="w-full h-full text-yellow-500"
                style={{ filter: 'blur(20px)' }}
              />
            </motion.div>
          </div>
        )}

        {/* Button content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-2">
          {isClaiming ? (
            <>
              <motion.div
                className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <span className="text-white font-semibold">Claiming...</span>
            </>
          ) : canClaimToday ? (
            <>
              <Gift className="w-10 h-10 text-white" />
              <span className="text-white text-lg font-bold">Claim Daily Reward</span>
              <span className="text-yellow-200 text-sm">
                +{calculateReward()} PHON
              </span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 border-4 border-gray-600 border-t-transparent rounded-full" />
              <span className="text-gray-500 font-semibold">Already Claimed</span>
              <span className="text-gray-600 text-xs">Come back tomorrow</span>
            </>
          )}
        </div>
      </motion.button>

      {/* Reward burst animation */}
      {showReward && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Floating +PHON coins */}
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-yellow-300 font-bold"
              initial={{
                x: '50%',
                y: '100%',
                opacity: 0,
              }}
              animate={{
                x: `${50 + (Math.random() - 0.5) * 80}%`,
                y: `${Math.random() * 50}%`,
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.1,
              }}
            >
              +{Math.floor(rewardAmount / 15)}
            </motion.div>
          ))}

          {/* Center reward display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="bg-gray-900/80 border-2 border-yellow-500 rounded-2xl px-8 py-4"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-3xl font-bold text-yellow-400">+{rewardAmount}</p>
                  <p className="text-xs text-gray-400">PHON</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
