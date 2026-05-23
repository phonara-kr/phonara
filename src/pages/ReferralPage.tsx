import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { Layout, Header } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { staggerContainer, staggerItem } from '../lib/animations';
import { Gift, Users, Copy, Check, Share2, Link2 } from 'lucide-react';

export function ReferralPage() {
  const { profile } = useAuthStore();
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}/signup?ref=${profile?.referral_code}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join PHONARA',
          text: 'Join me on PHONARA and get 100 PHON bonus!',
          url: referralLink,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      handleCopy();
    }
  };

  const stats = [
    { label: 'Total Referrals', value: 0, color: 'text-white' },
    { label: 'Referral Earnings', value: '0 PHON', color: 'text-green-400' },
    { label: 'Pending Rewards', value: '0 PHON', color: 'text-yellow-400' },
  ];

  return (
    <Layout>
      <Header title="Referral Program" subtitle="Invite friends and earn rewards" />

      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItem}>
          <Card className="p-6 bg-gradient-to-br from-purple-900/30 to-gray-900 border border-purple-700/30">
            <div className="flex flex-col items-center text-center">
              <motion.div
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-xl shadow-purple-500/20"
                animate={{
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Gift className="w-10 h-10 text-white" />
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-2">
                Invite Friends, Earn 100 PHON
              </h2>
              <p className="text-gray-400 text-sm">
                Share your referral link and earn 100 PHON for each friend who
                joins!
              </p>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Your Referral Code
            </h3>

            <div className="flex items-center gap-3 p-4 bg-gray-950 rounded-xl border border-gray-800">
              <div className="flex-1">
                <p className="text-gray-500 text-xs">Referral Link</p>
                <p className="text-blue-400 font-mono text-sm truncate">
                  {referralLink}
                </p>
              </div>

              <Button
                onClick={handleCopy}
                variant="secondary"
                size="sm"
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button onClick={handleCopy} variant="secondary" className="gap-2">
                <Link2 className="w-4 h-4" />
                Copy Link
              </Button>
              <Button onClick={handleShare} variant="primary" className="gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-4">
              Your Stats
            </h3>

            <div className="space-y-3">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="flex items-center justify-between p-3 bg-gray-950 rounded-lg"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <span className="text-gray-400">{stat.label}</span>
                  <span className={`font-semibold ${stat.color}`}>
                    {typeof stat.value === 'number' ? stat.value : stat.value}
                  </span>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card className="p-6 bg-gray-800/50 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">How It Works</h3>

            <div className="space-y-4">
              {[
                {
                  step: 1,
                  title: 'Share Your Link',
                  description: 'Send your unique referral link to friends',
                },
                {
                  step: 2,
                  title: 'Friend Signs Up',
                  description: 'Friend creates account using your link',
                },
                {
                  step: 3,
                  title: 'Both Earn Rewards',
                  description: 'You both get 100 PHON bonus!',
                },
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  className="flex items-start gap-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="text-sm text-gray-400">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
