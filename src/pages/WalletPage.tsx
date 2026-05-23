import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { useWalletStore } from '../stores/walletStore';
import { Layout, Header } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { AnimatedNumber } from '../shared/ui/CountUp';
import { staggerContainer, staggerItem } from '../lib/animations';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  Calendar,
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react';

const TRANSACTION_ICONS = {
  DEPOSIT: { icon: ArrowDownLeft, color: 'text-green-400', bg: 'bg-green-500/20' },
  WITHDRAWAL: { icon: ArrowUpRight, color: 'text-red-400', bg: 'bg-red-500/20' },
  REWARD: { icon: Gift, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  REFERRAL_BONUS: { icon: Gift, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  TRADING_PROFIT: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/20' },
  TRADING_LOSS: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/20' },
  MISSION: { icon: Target, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  DAILY_CLAIM: { icon: Calendar, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  MYSTERY_BOX: { icon: Gift, color: 'text-pink-400', bg: 'bg-pink-500/20' },
  MINIGAME: { icon: Target, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  ADMIN_ADJUSTMENT: { icon: DollarSign, color: 'text-gray-400', bg: 'bg-gray-500/20' },
};

export function WalletPage() {
  const { wallet, profile } = useAuthStore();
  const { transactions, fetchTransactions, isLoading } = useWalletStore();

  useEffect(() => {
    fetchTransactions(true);
  }, []);

  return (
    <Layout>
      <Header title="Wallet" subtitle="Your PHON balance and history" />

      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItem}>
          <Card className="p-6 bg-gradient-to-br from-blue-900/30 to-gray-900 border border-blue-700/30">
            <p className="text-gray-400 text-sm">Total Balance</p>
            <motion.p
              className="text-5xl font-bold mt-2 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent"
              key={wallet?.balance || 0}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatedNumber value={wallet?.balance || 0} decimals={2} />
            </motion.p>
            <p className="text-gray-500 text-sm mt-2">PHON</p>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-800">
              <div>
                <p className="text-gray-500 text-xs">Total Earned</p>
                <p className="text-green-400 font-semibold mt-1">
                  +<AnimatedNumber value={wallet?.total_earned || 0} decimals={2} />
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Total Spent</p>
                <p className="text-red-400 font-semibold mt-1">
                  -<AnimatedNumber value={wallet?.total_spent || 0} decimals={2} />
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <h2 className="text-lg font-semibold mb-3">Transaction History</h2>

          {transactions.length > 0 ? (
            <Card className="p-0 overflow-hidden">
              <motion.div className="divide-y divide-gray-800">
                {transactions.map((tx, index) => {
                  const IconConfig =
                    TRANSACTION_ICONS[tx.type as keyof typeof TRANSACTION_ICONS] ||
                    TRANSACTION_ICONS.REWARD;
                  const Icon = IconConfig.icon;

                  return (
                    <motion.div
                      key={tx.id}
                      className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${IconConfig.bg}`}
                        >
                          <Icon className={`w-5 h-5 ${IconConfig.color}`} />
                        </div>

                        <div>
                          <p className="text-sm font-medium text-white">
                            {tx.type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {tx.description || new Date(tx.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${
                            tx.amount >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {tx.amount >= 0 ? '+' : ''}
                          {tx.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Balance: {tx.balance_after.toFixed(2)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-gray-500">
              {isLoading ? 'Loading transactions...' : 'No transactions yet'}
            </Card>
          )}
        </motion.div>
      </motion.div>
    </Layout>
  );
}
