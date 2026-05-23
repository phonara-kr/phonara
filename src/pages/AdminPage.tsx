import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { AnimatedNumber } from '../shared/ui/CountUp';
import { staggerContainer, staggerItem } from '../lib/animations';
import {
  Shield,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  Ban,
  CheckCircle,
  AlertCircle,
  Search,
  RefreshCw,
} from 'lucide-react';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  frozenUsers: number;
}

interface EconomyStats {
  totalBalance: number;
  totalRewards: number;
  totalTransactions: number;
}

interface UserProfile {
  id: string;
  username: string;
  streak_days: number;
  total_rewards_earned: number;
  is_frozen: boolean;
  created_at: string;
  wallet?: {
    balance: number;
    total_earned: number;
    total_spent: number;
  };
}

export function AdminPage() {
  const { user } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    frozenUsers: 0,
  });
  const [economyStats, setEconomyStats] = useState<EconomyStats>({
    totalBalance: 0,
    totalRewards: 0,
    totalTransactions: 0,
  });
  const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    setIsAdmin(!!data);
    setLoading(false);

    if (data) {
      fetchStats();
      fetchRecentUsers();
    }
  };

  const fetchStats = async () => {
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: frozenUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_frozen', true);

    const { data: wallets } = await supabase
      .from('wallets')
      .select('balance, total_earned');

    const { count: txCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    if (wallets) {
      const totalBalance = wallets.reduce(
        (sum, w) => sum + (w.balance || 0),
        0
      );
      const totalRewards = wallets.reduce(
        (sum, w) => sum + (w.total_earned || 0),
        0
      );

      setEconomyStats({
        totalBalance,
        totalRewards,
        totalTransactions: txCount || 0,
      });
    }

    setUserStats({
      totalUsers: totalUsers || 0,
      activeUsers: (totalUsers || 0) - (frozenUsers || 0),
      frozenUsers: frozenUsers || 0,
    });
  };

  const fetchRecentUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select(
        `
        id,
        username,
        streak_days,
        total_rewards_earned,
        is_frozen,
        created_at,
        wallet:wallets(balance, total_earned, total_spent)
      `
      )
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setRecentUsers(data as UserProfile[]);
    }
  };

  const handleUserAction = async (action: 'freeze' | 'unfreeze', userId: string) => {
    setActionLoading(true);

    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-control`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action,
            target_user_id: userId,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        await fetchRecentUsers();
        await fetchStats();

        if (selectedUser?.id === userId) {
          setSelectedUser({
            ...selectedUser,
            is_frozen: action === 'freeze',
          });
        }
      }
    } catch (error) {
      console.error('Admin action error:', error);
    }

    setActionLoading(false);
  };

  const filteredUsers = recentUsers.filter(
    (u) =>
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <motion.div
        className="min-h-screen bg-gray-950 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>
    );
  }

  if (!isAdmin) {
    return (
      <motion.div
        className="min-h-screen bg-gray-950 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Card className="p-8 text-center max-w-md">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-400">
            You don't have admin privileges to access this page.
          </p>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      <div className="px-4 max-w-7xl mx-auto pt-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-400" />
              Admin Dashboard
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Platform management and analytics
            </p>
          </div>
          <Button
            onClick={() => {
              fetchStats();
              fetchRecentUsers();
            }}
            variant="secondary"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={staggerItem}>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <Users className="w-4 h-4" />
                  Total Users
                </div>
                <p className="text-3xl font-bold">
                  {userStats.totalUsers.toLocaleString()}
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <Activity className="w-4 h-4" />
                  Active Users
                </div>
                <p className="text-3xl font-bold text-green-400">
                  {userStats.activeUsers.toLocaleString()}
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <DollarSign className="w-4 h-4" />
                  Total PHON
                </div>
                <p className="text-3xl font-bold text-blue-400">
                  <AnimatedNumber value={economyStats.totalBalance} decimals={0} />
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <TrendingUp className="w-4 h-4" />
                  Total Transactions
                </div>
                <p className="text-3xl font-bold">
                  {economyStats.totalTransactions.toLocaleString()}
                </p>
              </Card>
            </div>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card className="p-4">
              <h3 className="font-semibold mb-3">User Management</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-sm"
                />
              </div>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card className="p-0 overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h3 className="font-semibold">Recent Users</h3>
              </div>

              <div className="divide-y divide-gray-800">
                {filteredUsers.map((u, index) => (
                  <motion.div
                    key={u.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedUser(u)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          u.is_frozen
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {u.is_frozen ? (
                          <Ban className="w-5 h-5" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <p className="font-medium">{u.username || u.id.substring(0, 8)}</p>
                        <p className="text-xs text-gray-500">
                          Balance: {u.wallet?.balance?.toFixed(2) || 0} PHON
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-400">
                        {u.streak_days} day streak
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {selectedUser && (
          <motion.div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">
                    {selectedUser.username || 'User'}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedUser.id}</p>
                </div>

                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedUser.is_frozen
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {selectedUser.is_frozen ? 'Frozen' : 'Active'}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Balance</span>
                  <span className="font-medium">
                    {selectedUser.wallet?.balance?.toFixed(2) || 0} PHON
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Earned</span>
                  <span className="font-medium text-green-400">
                    +{selectedUser.wallet?.total_earned?.toFixed(2) || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Streak</span>
                  <span className="font-medium">
                    {selectedUser.streak_days} days
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() =>
                    handleUserAction(
                      selectedUser.is_frozen ? 'unfreeze' : 'freeze',
                      selectedUser.id
                    )
                  }
                  variant={selectedUser.is_frozen ? 'primary' : 'danger'}
                  className="flex-1"
                  isLoading={actionLoading}
                >
                  {selectedUser.is_frozen ? 'Unfreeze' : 'Freeze'}
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setSelectedUser(null)}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <Button
            onClick={() => window.history.back()}
            variant="ghost"
            className="w-full"
          >
            Back to App
          </Button>
        </div>
      </nav>
    </div>
  );
}
