// Step 2: Profile Setup
// Quick username/avatar setup for emotional connection
import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Camera, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';

interface StepProfileSetupProps {
  onNext: () => void;
}

export function StepProfileSetup({ onNext }: StepProfileSetupProps) {
  const { user, profile, updateProfile } = useAuthStore();
  const [username, setUsername] = useState(profile?.username || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!username.trim()) return;

    setIsLoading(true);
    try {
      if (user) {
        await supabase
          .from('profiles')
          .update({ username: username.trim() })
          .eq('id', user.id);

        updateProfile({ username: username.trim() });
      }

      // Mark step as complete
      await supabase.rpc('complete_onboarding_step', {
        p_user_id: user.id,
        p_step: 2,
      });

      onNext();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-center">
      <motion.div
        className="mb-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">Create Your Profile</h1>
        <p className="text-gray-400">Personalize your PHONARA experience</p>
      </motion.div>

      {/* Avatar */}
      <motion.div
        className="mb-8 flex justify-center"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: 'spring' }}
      >
        <div className="relative">
          <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30">
            <User className="w-16 h-16 text-white" />
          </div>
          <button className="absolute bottom-0 right-0 w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center border-2 border-gray-600 transition-colors">
            <Camera className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </motion.div>

      {/* Username input */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          className="w-full max-w-md px-6 py-4 bg-gray-900 border border-gray-700 rounded-2xl text-white text-center text-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          maxLength={20}
        />
        <p className="text-gray-500 text-sm mt-2">This is how others will see you</p>
      </motion.div>

      {/* Continue button */}
      <motion.button
        onClick={handleContinue}
        className="px-12 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-lg font-semibold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={!username.trim() || isLoading}
      >
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            Continue
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </motion.button>
    </div>
  );
}
