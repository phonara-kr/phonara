// Step 4: Referral Opportunity
// Share your referral code for bonus rewards
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Share2, Users, Check, Copy } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';

interface StepReferralProps {
  onComplete: () => void;
}

export function StepReferral({ onComplete }: StepReferralProps) {
  const { user, profile } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const referralCode = profile?.referral_code || 'LOADING';
  const referralLink = `https://phonara.com/join/${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      if (user) {
        await supabase.rpc('complete_onboarding_step', {
          p_user_id: user.id,
          p_step: 4,
        });

        // Mark onboarding as complete
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
      }

      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="text-center">
      <motion.div
        className="mb-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4 shadow-xl shadow-green-500/30">
          <Gift className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Invite Friends</h1>
        <p className="text-gray-400">Earn rewards for every friend who joins!</p>
      </motion.div>

      {/* Referral bonus card */}
      <motion.div
        className="mb-8 bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-2xl p-6 max-w-md mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <Users className="w-8 h-8 text-green-400" />
          <div className="text-left">
            <p className="text-2xl font-bold text-white">+50 PHON</p>
            <p className="text-sm text-gray-400">Per referral</p>
          </div>
        </div>

        <div className="text-sm text-gray-300 mb-4">
          Share your unique link and both of you get 50 PHON when they sign up!
        </div>

        {/* Referral code */}
        <div className="bg-gray-900/50 rounded-xl p-4 mb-4">
          <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Your Referral Code</div>
          <div className="text-2xl font-mono font-bold text-white mb-2">{referralCode}</div>

          <div className="flex gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-400"
            />
            <motion.button
              onClick={handleCopy}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white flex items-center gap-2 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Share buttons */}
      <motion.div
        className="mb-8 flex justify-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.button
          className="w-12 h-12 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Share2 className="w-5 h-5 text-gray-400" />
        </motion.button>
      </motion.div>

      {/* Complete button */}
      <motion.button
        onClick={handleComplete}
        className="px-12 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-lg font-semibold rounded-2xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all disabled:opacity-50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={isCompleting}
      >
        {isCompleting ? 'Completing...' : 'Start Earning!'}
      </motion.button>

      {/* Skip link */}
      <motion.button
        onClick={handleComplete}
        className="block mx-auto mt-4 text-gray-500 text-sm hover:text-gray-400 transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Skip for now
      </motion.button>
    </div>
  );
}
