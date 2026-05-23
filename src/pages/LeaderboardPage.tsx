import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Layout, Header } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { staggerContainer, staggerItem } from '../lib/animations';
import { Trophy, Medal, TrendingUp, Users, Gift } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  rank: number;
  username: string;
  total_pnl: number;
  total_trades: number;
  total_rewards: number;
  win_rate: number;
  user_id: string;
}

export function LeaderboardPage() {
  const { profile, user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'ALL_TIME' | 'WEEKLY' | 'DAILY'>('ALL_TIME');

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select('*')
      .order('total_rewards', { ascending: false })
      .limit(50);

    if (!error && data) {
      const ranked = data.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));
      setLeaderboard(ranked);
    }

    setIsLoading(false);
  };

  const userRank = leaderboard.find((entry) => entry.user_id === user?.id);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Medal className="w-6 h-6 text-orange-400" />;
      default:
        return <span className="text-gray-500 text-sm">{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-900/30 to-gray-900 border-yellow-700/30';
      case 2:
        return 'bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700';
      case 3:
        return 'bg-gradient-to-r from-orange-900/30 to-gray-900 border-orange-700/30';
      default:
        return 'bg-gray-800/50 border-gray-700';
    }
  };

  return (
    <Layout>
      <Header title="Leaderboard" subtitle="Top PHON earners this season" />

      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItem}>
          <div className="grid grid-cols-3 gap-2">
            {(['DAILY', 'WEEKLY', 'ALL_TIME'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`py-2 px-4 rounded-lg text-xs font-medium transition-colors ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {p.replace('_', ' ')}
              </button>
            ))}
          </div>
        </motion.div>

        {userRank && (
          <motion.div variants={staggerItem}>
            <Card className="p-4 bg-gradient-to-r from-blue-900/30 to-gray-900 border border-blue-700/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold text-blue-400">
                    #{userRank.rank}
                  </div>
                  <div>
                    <p className="font-medium text-white">Your Rank</p>
                    <p className="text-sm text-gray-400">
                      {userRank.total_rewards.toFixed(2)} PHON earned
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-400">
                    {userRank.total_trades} trades
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        <motion.div variants={staggerItem}>
          {isLoading ? (
            <Card className="p-8 text-center text-gray-500">
              Loading leaderboard...
            </Card>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 10).map((entry, index) => {
                const isCurrentUser = entry.user_id === user?.id;

                return (
                  <motion.div
                    key={entry.id}
                    className={`rounded-xl border ${getRankBg(entry.rank)} ${
                      isCurrentUser ? 'ring-2 ring-blue-500' : ''
                    }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                          {getRankIcon(entry.rank)}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">
                              {entry.username?.split('@')[0] || 'Anonymous'}
                            </p>
                            {isCurrentUser && (
                              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {entry.total_trades} trades
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-green-400">
                          {entry.total_rewards.toFixed(0)} PHON
                        </p>
                        <p className="text-xs text-gray-500">earned</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {leaderboard.length > 10 && (
          <motion.div variants={staggerItem}>
            <Card className="p-4 text-center">
              <p className="text-sm text-gray-400">
                View full leaderboard to see all {leaderboard.length} participants
              </p>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </Layout>
  );
}
