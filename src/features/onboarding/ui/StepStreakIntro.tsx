// Step 3: Streak Introduction
// Fire animation explaining the streak system
import { motion } from 'framer-motion';
import { Flame, Calendar, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';

interface StepStreakIntroProps {
  onNext: () => void;
}

export function StepStreakIntro({ onNext }: StepStreakIntroProps) {
  const { user } = useAuthStore();

  const handleContinue = async () => {
    try {
      if (user) {
        await supabase.rpc('complete_onboarding_step', {
          p_user_id: user.id,
          p_step: 3,
        });
      }
      onNext();
    } catch (error) {
      console.error('Error completing step:', error);
    }
  };

  const streakDays = [1, 2, 3, 4, 5, 6, 7];
  const rewards = [10, 15, 20, 25, 30, 35, 80];

  return (
    <div className="text-center">
      <motion.div
        className="mb-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="inline-flex items-center justify-center w-32 h-32 mb-4">
          <Flame
            className="w-32 h-32 text-orange-500"
            style={{
              filter: 'drop-shadow(0 0 20px rgba(249, 115, 22, 0.6))',
            }}
          />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Daily Streaks</h1>
        <p className="text-gray-400">Claim every day to build your streak and earn more!</p>
      </motion.div>

      {/* Streak calendar visualization */}
      <motion.div
        className="mb-8 bg-gray-900/50 border border-gray-800 rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-gray-400 text-sm">Your First Week</span>
        </div>

        <div className="flex justify-center gap-2">
          {streakDays.map((day, idx) => (
            <motion.div
              key={day}
              className="flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  idx === 0
                    ? 'bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/40'
                    : idx === 6
                    ? 'bg-gradient-to-br from-yellow-500 to-orange-600 border-2 border-yellow-400'
                    : 'bg-gray-800'
                }`}
              >
                {idx === 0 ? (
                  <Flame className="w-6 h-6 text-white" />
                ) : idx === 6 ? (
                  <TrendingUp className="w-6 h-6 text-white" />
                ) : (
                  <span className="text-gray-500 text-sm">{day}</span>
                )}
              </div>
              <span className="text-xs text-gray-400">+{rewards[idx]}</span>
              {idx === 6 && (
                <span className="text-xs text-yellow-400">2x</span>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Day 7 rewards are <span className="text-yellow-400 font-bold">doubled!</span>
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="mb-8 grid grid-cols-2 gap-4 max-w-md mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">+10%</p>
          <p className="text-xs text-gray-500">Daily Bonus</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">7 Days</p>
          <p className="text-xs text-gray-500">Weekly Reward</p>
        </div>
      </motion.div>

      {/* Continue button */}
      <motion.button
        onClick={handleContinue}
        className="px-12 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white text-lg font-semibold rounded-2xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all inline-flex items-center gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Start My Streak
        <ArrowRight className="w-5 h-5" />
      </motion.button>
    </div>
  );
}
