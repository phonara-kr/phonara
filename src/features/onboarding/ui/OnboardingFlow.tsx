// Onboarding Flow - 4-Step Forced Onboarding
// Fullscreen, non-skippable, emotionally rewarding experience
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepWelcome } from './StepWelcome';
import { StepProfileSetup } from './StepProfileSetup';
import { StepStreakIntro } from './StepStreakIntro';
import { StepReferral } from './StepReferral';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const steps = [
    <StepWelcome key="welcome" onNext={handleNext} />,
    <StepProfileSetup key="profile" onNext={handleNext} />,
    <StepStreakIntro key="streak" onNext={handleNext} />,
    <StepReferral key="referral" onComplete={onComplete} />,
  ];

  return (
    <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-50">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-900/20 via-transparent to-transparent" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-900/20 via-transparent to-transparent" />
      </div>

      {/* Progress indicator */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {Array.from({ length: totalSteps }).map((_, idx) => (
          <div
            key={idx}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              idx === currentStep ? 'bg-blue-500 w-8' : idx < currentStep ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Step counter */}
      <div className="absolute top-8 right-8 text-gray-500 text-sm">
        {currentStep + 1} / {totalSteps}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-2xl px-8"
        >
          {steps[currentStep]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
