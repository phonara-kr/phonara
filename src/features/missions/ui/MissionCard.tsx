// Mission Card - Progress tracking with satisfying animations
import { motion } from 'framer-motion';
import { Target, Gift, Check } from 'lucide-react';

interface Mission {
  id: string;
  mission_type: string;
  target: number;
  progress: number;
  reward: number;
  is_completed: boolean;
  expires_at: string | null;
}

interface MissionCardProps {
  mission: Mission;
  onClaim?: () => void;
}

export function MissionCard({ mission, onClaim }: MissionCardProps) {
  const progressPercent = Math.min((mission.progress / mission.target) * 100, 100);
  const isReady = mission.progress >= mission.target && !mission.is_completed;

  const getMissionLabel = (type: string) => {
    const labels: Record<string, string> = {
      'LOGIN_STREAK': 'Daily Login',
      'DAILY_CLAIM': 'Claim Rewards',
      'FIRST_REFERRAL': 'Invite a Friend',
      'OPEN_BOX': 'Open Mystery Box',
    };
    return labels[type] || type;
  };

  const getProgressText = () => {
    if (mission.mission_type === 'LOGIN_STREAK') {
      return `${mission.progress}/${mission.target} days`;
    }
    return `${mission.progress}/${mission.target}`;
  };

  return (
    <motion.div
      className={`relative overflow-hidden rounded-xl border ${
        isReady
          ? 'bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-500/40'
          : mission.is_completed
          ? 'bg-gray-900/30 border-gray-700'
          : 'bg-gray-900/50 border-gray-800'
      }`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Completed overlay */}
      {mission.is_completed && (
        <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center z-10">
          <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
            <Check className="w-6 h-6 text-gray-500" />
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isReady ? 'bg-green-500/20' : 'bg-gray-800'
              }`}
            >
              <Target
                className={`w-5 h-5 ${
                  isReady ? 'text-green-400' : 'text-gray-500'
                }`}
              />
            </div>
            <div>
              <h3 className="text-white text-sm font-semibold">
                {getMissionLabel(mission.mission_type)}
              </h3>
              <p className="text-gray-500 text-xs">{getProgressText()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-bold">+{mission.reward}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              isReady
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : 'bg-gradient-to-r from-blue-500 to-blue-600'
            }`}
            initial={{ width: '0%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        {/* Claim button */}
        {isReady && onClaim && (
          <motion.button
            onClick={onClaim}
            className="w-full mt-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm font-semibold transition-colors"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.95 }}
          >
            Claim Reward
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
