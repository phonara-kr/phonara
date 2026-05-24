// Streak Calendar - Visual streak history with fire animations
import { motion } from 'framer-motion';
import { Flame, Calendar, Gift } from 'lucide-react';

interface StreakCalendarProps {
  streakDays: number;
  lastClaimDate: string | null;
  canClaimToday: boolean;
}

export function StreakCalendar({ streakDays, lastClaimDate, canClaimToday }: StreakCalendarProps) {
  // Generate last 7 days for calendar view
  const generateWeekDays = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  };

  const weekDays = generateWeekDays();
  const today = new Date().toDateString();

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Flame
              className="w-8 h-8 text-orange-500"
              style={{
                filter: streakDays > 0 ? 'drop-shadow(0 0 10px rgba(249, 115, 22, 0.6))' : 'none',
              }}
            />
            {streakDays > 0 && (
              <motion.div
                className="absolute -top-1 -right-1 bg-orange-500 rounded-full w-5 h-5 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
              >
                <span className="text-xs text-white font-bold">{streakDays}</span>
              </motion.div>
            )}
          </div>
          <div>
            <p className="text-white font-semibold">{streakDays} Day Streak</p>
            <p className="text-gray-500 text-xs">
              {streakDays > 0 ? 'Keep it going!' : 'Start your streak today'}
            </p>
          </div>
        </div>
        <Calendar className="w-6 h-6 text-gray-600" />
      </div>

      {/* Week calendar view */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {weekDays.map((date, idx) => {
          const isToday = date.toDateString() === today;
          const dayNum = date.getDate();
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
          const wasClaimed = false; // TODO: Check from history

          return (
            <div
              key={idx}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-xs text-gray-600 mb-1">{dayName}</span>
              <motion.div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isToday
                    ? canClaimToday
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/40'
                      : 'bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/40'
                    : wasClaimed
                    ? 'bg-gradient-to-br from-orange-500/20 to-red-600/20 border border-orange-500/30'
                    : 'bg-gray-800'
                }`}
                whileHover={isToday && canClaimToday ? { scale: 1.1 } : {}}
              >
                <span
                  className={`text-sm ${
                    isToday || wasClaimed ? 'text-white font-bold' : 'text-gray-600'
                  }`}
                >
                  {dayNum}
                </span>
              </motion.div>
              {isToday && canClaimToday && (
                <Gift className="w-3 h-3 text-blue-400" />
              )}
            </div>
          );
        })}
      </div>

      {/* Streak milestones */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-600">Next milestone:</span>
        <span className="text-xs text-orange-400 font-semibold">
          {((Math.floor(streakDays / 7) + 1) * 7) - streakDays} days to {((Math.floor(streakDays / 7) + 1) * 7)}x weekly bonus!
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="absolute inset-0 flex">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-gray-900 last:border-r-0"
            />
          ))}
        </div>
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${((streakDays % 7) / 7) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Streak benefits */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Day 7 rewards are doubled! Keep your streak for maximum rewards.
      </div>
    </div>
  );
}
