import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { Button } from '../shared/ui/Button';
import { fadeUp, scaleIn, rewardBurst } from '../lib/animations';
import { Gift, Target, Users, Flame, TrendingUp } from 'lucide-react';

const ONBOARDING_STEPS = [
  {
    id: 1,
    title: 'Welcome to PHONARA',
    subtitle: 'You received a welcome bonus!',
    icon: Gift,
    reward: 100,
    color: 'from-yellow-500 to-orange-500',
    description: 'Start your journey with 100 PHON tokens',
  },
  {
    id: 2,
    title: 'Complete Your First Mission',
    subtitle: 'Earn rewards by completing missions',
    icon: Target,
    reward: 50,
    color: 'from-blue-500 to-cyan-500',
    description: 'Try claiming your daily reward',
  },
  {
    id: 3,
    title: 'Invite Friends',
    subtitle: 'Share the rewards',
    icon: Users,
    reward: 100,
    color: 'from-purple-500 to-pink-500',
    description: 'Get 100 PHON for each friend who joins',
  },
  {
    id: 4,
    title: 'Start Your Streak',
    subtitle: 'Daily login rewards',
    icon: Flame,
    reward: 10,
    color: 'from-red-500 to-orange-500',
    description: 'Login daily to build your streak and earn more',
  },
];

export function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const { profile, updateOnboardingStep, completeOnboarding } = useAuthStore();
  const navigate = useNavigate();

  const currentStepData = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  const handleNextStep = async () => {
    setShowReward(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    setShowReward(false);

    if (isLastStep) {
      await completeOnboarding();
      navigate('/home');
    } else {
      await updateOnboardingStep(currentStep + 1);
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4"
      variants={fadeUp}
      initial="initial"
      animate="animate"
    >
      <AnimatePresence mode="wait">
        {showReward && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <motion.div
                className="text-6xl"
                animate={{
                  scale: [0, 1.5, 1],
                  rotate: [0, 360],
                }}
                transition={{ duration: 0.5 }}
              >
                {currentStepData.reward >= 100 ? '🎉' : '⭐'}
              </motion.div>

              <motion.div
                className="text-4xl font-bold text-yellow-400"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                +{currentStepData.reward} PHON
              </motion.div>

              {Array.from({ length: 15 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full bg-yellow-400"
                  style={{
                    left: '50%',
                    top: '50%',
                  }}
                  animate={{
                    x: (Math.random() - 0.5) * 300,
                    y: (Math.random() - 0.5) * 300,
                    opacity: [1, 0],
                    scale: [1, 0],
                  }}
                  transition={{
                    duration: 0.8,
                    delay: i * 0.03,
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          className="w-full max-w-md"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
        >
          <div className="flex items-center justify-center gap-2 mb-8">
            {ONBOARDING_STEPS.map((_, index) => (
              <motion.div
                key={index}
                className={`h-1.5 rounded-full ${
                  index <= currentStep ? 'w-8 bg-blue-500' : 'w-5 bg-gray-700'
                }`}
                animate={{
                  width: index <= currentStep ? 32 : 20,
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>

          <motion.div
            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-3xl p-8 shadow-2xl"
            variants={scaleIn}
          >
            <motion.div
              className={`w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${currentStepData.color} flex items-center justify-center shadow-xl`}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
              }}
            >
              <currentStepData.icon className="w-12 h-12 text-white" />
            </motion.div>

            <motion.h2
              className="text-2xl font-bold text-center mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {currentStepData.title}
            </motion.h2>

            <motion.p
              className="text-gray-400 text-center mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {currentStepData.subtitle}
            </motion.p>

            <motion.div
              className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-full border border-yellow-500/20 mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Gift className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-semibold">
                +{currentStepData.reward} PHON
              </span>
            </motion.div>

            <motion.p
              className="text-gray-300 text-center text-sm mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {currentStepData.description}
            </motion.p>

            <Button
              onClick={handleNextStep}
              className="w-full"
              size="lg"
            >
              {isLastStep ? 'Start Earning' : 'Next'}
            </Button>
          </motion.div>

          {currentStep === 2 && (
            <motion.div
              className="mt-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <p className="text-gray-400 text-sm">Your Referral Code</p>
                <p className="text-blue-400 font-mono text-lg mt-1">
                  {profile?.referral_code || 'LOADING...'}
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
