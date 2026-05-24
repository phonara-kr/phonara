// Trading Panel with Long/Short Selection
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useTradingStore } from '../../../stores/tradingStore';
import { useAuthStore } from '../../../stores/authStore';
import { LeverageSlider } from './LeverageSlider';

export function TradingPanel() {
  const {
    positionType,
    setPositionType,
    amount,
    setAmount,
    openPosition,
    isLoading,
    error,
    currentPrice,
  } = useTradingStore();

  const { wallet } = useAuthStore();
  const [localError, setLocalError] = useState<string | null>(null);

  const handleOpenPosition = async () => {
    setLocalError(null);

    // Validation
    const margin = amount / useTradingStore.getState().leverage;
    if (margin > (wallet?.balance || 0)) {
      setLocalError('Insufficient balance');
      return;
    }

    const result = await openPosition();
    if (!result.success && result.error) {
      setLocalError(result.error);
    }
  };

  const buttonGradient = positionType === 'LONG'
    ? 'from-green-600 to-green-700 shadow-green-500/40'
    : 'from-red-600 to-red-700 shadow-red-500/40';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
      {/* Long/Short Toggle */}
      <div className="relative bg-gray-800 rounded-xl p-1 flex gap-1">
        <motion.button
          onClick={() => setPositionType('LONG')}
          className={`relative flex-1 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            positionType === 'LONG'
              ? 'text-white'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          whileTap={{ scale: 0.98 }}
        >
          {positionType === 'LONG' && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-700 rounded-lg"
              layoutId="positionTypeSlider"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <TrendingUp className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Long</span>
        </motion.button>

        <motion.button
          onClick={() => setPositionType('SHORT')}
          className={`relative flex-1 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            positionType === 'SHORT'
              ? 'text-white'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          whileTap={{ scale: 0.98 }}
        >
          {positionType === 'SHORT' && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 rounded-lg"
              layoutId="positionTypeSlider"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <TrendingDown className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Short</span>
        </motion.button>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <label className="text-gray-400 text-sm">Amount (PHON)</label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-blue-500"
            min="1"
            max={wallet?.balance || 1000}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
            {[25, 50, 75, 100].map((percent) => (
              <button
                key={percent}
                onClick={() => setAmount(((wallet?.balance || 0) * percent) / 100)}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                {percent}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leverage Slider */}
      <LeverageSlider />

      {/* Order Summary */}
      <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Entry Price</span>
          <span className="text-white">${currentPrice.toFixed(4)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Direction</span>
          <span className={positionType === 'LONG' ? 'text-green-400' : 'text-red-400'}>
            {positionType}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Margin Required</span>
          <span className="text-white">${(amount / useTradingStore.getState().leverage).toFixed(2)}</span>
        </div>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {(error || localError) && (
          <motion.div
            className="bg-red-900/20 border border-red-500/50 rounded-lg p-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <p className="text-red-400 text-sm">{error || localError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Open Position Button */}
      <motion.button
        onClick={handleOpenPosition}
        className={`w-full py-4 bg-gradient-to-r ${buttonGradient} text-white text-lg font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Opening...
          </>
        ) : (
          <>
            Open {positionType} Position
            {positionType === 'LONG' ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
          </>
        )}
      </motion.button>

      {/* Wallet Balance */}
      <div className="text-center text-xs text-gray-500">
        Available: <span className="text-white font-semibold">{wallet?.balance.toFixed(2)} PHON</span>
      </div>
    </div>
  );
}
