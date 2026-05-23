import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { useRewardStore } from '../stores/rewardStore';
import { Layout, Header } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { AnimatedNumber } from '../shared/ui/CountUp';
import { RewardBurst, StreakFire } from '../shared/ui/RewardBurst';
import { fadeUp, staggerContainer, staggerItem } from '../lib/animations';
import { Gift, Calendar, Target, Trophy, TrendingUp, Clock, Gamepad2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  amount: number;
  timestamp: string;
}

export function HomePage() {
  const { profile, wallet } = useAuthStore();
  const { todayReward, claimDailyReward, checkDailyReward, isLoading } =
    useRewardStore();
  const [showRewardBurst, setShowRewardBurst] = useState(false);
  const [claimedReward, setClaimedReward] = useState<number | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    checkDailyReward();

    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        user: 'User***23',
        action: 'earned',
        amount: 120,
        timestamp: '2m ago',
      },
      {
        id: '2',
        user: 'Trade***45',
        action: 'claimed daily',
        amount: 15,
        timestamp: '5m ago',
      },
      {
        id: '3',
        user: 'Play***67',
        action: 'completed mission',
        amount: 50,
        timestamp: '8m ago',
      },
      {
        id: '4',
        user: 'New***89',
        action: 'received referral bonus',
        amount: 100,
        timestamp: '12m ago',
      },
      {
        id: '5',
        user: 'Streak***12',
        action: '7-day streak bonus',
        amount: 50,
        timestamp: '20m ago',
      },
    ];

    setActivities(mockActivities);

    const interval = setInterval(() => {
      const randomActivity: ActivityItem = {
        id: Math.random().toString(36).substr(2, 9),
        user: `User***${Math.floor(Math.random() * 99)}`,
        action: ['earned', 'claimed daily', 'completed mission'][
          Math.floor(Math.random() * 3)
        ],
        amount: Math.floor(Math.random() * 100) + 10,
        timestamp: 'Just now',
      };

      setActivities((prev) => [randomActivity, ...prev.slice(0, 9)]);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleClaimDaily = async () => {
    const result = await claimDailyReward();

    if (result.success && result.reward) {
      setClaimedReward(result.reward);
      setShowRewardBurst(true);
    }
  };

  return (
    <Layout>
      <Header
        title={`Hello, ${profile?.username?.split('@')[0] || 'User'}`}
        subtitle="Ready to earn today?"
      />

      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItem}>
          <Card className="p-6 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Your Balance</p>
                <motion.p
                  className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mt-1"
                  key={wallet?.balance || 0}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <AnimatedNumber
                    value={wallet?.balance || 0}
                    decimals={2}
                  />
                </motion.p>
                <p className="text-gray-500 text-xs mt-2">PHON</p>
              </div>

              <motion.div
                className="flex gap-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Link to="/trade">
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <TrendingUp className="w-6 h-6 text-blue-400" />
                  </motion.div>
                </Link>
              </motion.div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card
            className={`p-6 ${
              todayReward.claimed
                ? 'bg-gray-800/50 border-gray-700'
                : 'bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-yellow-600/30'
            }`}
            hoverable={!todayReward.claimed}
            onClick={todayReward.claimed ? undefined : handleClaimDaily}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  className="w-14 h-14 rounded-xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30"
                  animate={
                    !todayReward.claimed
                      ? {
                          scale: [1, 1.05, 1],
                          rotate: [0, 5, -5, 0],
                        }
                      : {}
                  }
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Calendar
                    className={`w-7 h-7 ${
                      todayReward.claimed ? 'text-gray-500' : 'text-yellow-400'
                    }`}
                  />
                </motion.div>

                <div>
                  <p
                    className={`font-semibold ${
                      todayReward.claimed ? 'text-gray-400' : 'text-white'
                    }`}
                  >
                    {todayReward.claimed ? 'Claimed Today' : 'Daily Reward'}
                  </p>
                  {!todayReward.claimed && (
                    <p className="text-yellow-400 text-sm mt-1">
                      Tap to claim +{todayReward.streak >= 7 ? 50 : 10 + todayReward.streak * 3} PHON
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <StreakFire streak={todayReward.streak} />
                {todayReward.claimed && todayReward.nextClaimAt && (
                  <div className="flex items-center gap-1 text-gray-500 text-xs mt-2">
                    <Clock className="w-3 h-3" />
                    <span>Next in 24h</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <div className="grid grid-cols-3 gap-3">
            <Link to="/trade">
              <Card
                hoverable
                className="p-4 flex flex-col items-center gap-2"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-xs text-gray-400">Trade</span>
              </Card>
            </Link>

            <Link to="/referral">
              <Card
                hoverable
                className="p-4 flex flex-col items-center gap-2"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-xs text-gray-400">Refer</span>
              </Card>
            </Link>

            <Link to="/leaderboard">
              <Card
                hoverable
                className="p-4 flex flex-col items-center gap-2"
              >
                <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                </div>
                <span className="text-xs text-gray-400">Ranks</span>
              </Card>
            </Link>

            <Link to="/game">
              <Card
                hoverable
                className="p-4 flex flex-col items-center gap-2"
              >
                <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-xs text-gray-400">Game</span>
              </Card>
            </Link>
          </div>
        </motion.div>

        <motion.div variants={staggerItem}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Live Activity</h2>
            <motion.div
              className="flex items-center gap-1 text-green-400 text-xs"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-2 h-2 rounded-full bg-green-500" />
              LIVE
            </motion.div>
          </div>

          <Card className="p-0 overflow-hidden">
            <motion.div className="divide-y divide-gray-800">
              {activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-xs font-medium">
                      {activity.user.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.user}</p>
                      <p className="text-xs text-gray-500">{activity.action}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-400">
                      +{activity.amount} PHON
                    </p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </Card>
        </motion.div>
      </motion.div>

      {showRewardBurst && claimedReward && (
        <RewardBurst
          amount={claimedReward}
          onComplete={() => setShowRewardBurst(false)}
        />
      )}
    </Layout>
  );
}
