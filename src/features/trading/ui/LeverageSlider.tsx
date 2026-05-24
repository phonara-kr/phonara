// Leverage Slider with Real-time Liquidation Calculation
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { useTradingStore } from '../../../stores/tradingStore';
import { calculateLiquidationPrice } from '../../../stores/tradingStore';

export function LeverageSlider() {
  const { leverage, setLeverage, currentPrice, positionType } = useTradingStore();
  const liquidationPrice = calculateLiquidationPrice(currentPrice, leverage, positionType);

  const leverageLevels = [1, 2, 3, 5, 10, 20, 25, 50, 75, 100];
  const isHighRisk = leverage >= 50;

  const getRiskColor = () => {
    if (leverage <= 10) return 'text-green-400';
    if (leverage <= 25) return 'text-yellow-400';
    if (leverage <= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const getRiskBg = () => {
    if (leverage <= 10) return 'from-green-600 to-green-700';
    if (leverage <= 25) return 'from-yellow-600 to-orange-600';
    if (leverage <= 50) return 'from-orange-600 to-red-600';
    return 'from-red-600 to-red-700';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">Leverage</span>
        <motion.div
          className={`px-3 py-1 rounded-lg bg-gradient-to-r ${getRiskBg()} text-white font-bold text-sm`}
          key={leverage}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {leverage}x
        </motion.div>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min="1"
          max="100"
          value={leverage}
          onChange={(e) => setLeverage(Number(e.target.value))}
          className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right,
              #10b981 0%,
              #eab308 30%,
              #f97316 60%,
              #ef4444 80%,
              #dc2626 100%
            )`,
          }}
        />
        <style>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: linear-gradient(to bottom right, #3b82f6, #1d4ed8);
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
          }
          .slider::-moz-range-thumb {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: linear-gradient(to bottom right, #3b82f6, #1d4ed8);
            cursor: pointer;
            border: none;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
          }
        `}</style>
      </div>

      {/* Quick select buttons */}
      <div className="grid grid-cols-5 gap-2">
        {leverageLevels.map((level) => (
          <motion.button
            key={level}
            onClick={() => setLeverage(level)}
            className={`py-2 rounded-lg text-sm font-semibold transition-all ${
              leverage === level
                ? `bg-gradient-to-r ${getRiskBg()} text-white`
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            {level}x
          </motion.button>
        ))}
      </div>

      {/* Liquidation Price Display */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-xs uppercase tracking-wide">Liquidation Price</span>
          <TrendingUp className="w-4 h-4 text-red-400" />
        </div>
        <motion.p
          className={`text-2xl font-bold ${getRiskColor()}`}
          key={liquidationPrice}
          initial={{ opacity: 0.5, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          ${liquidationPrice.toFixed(4)}
        </motion.p>
        <p className="text-xs text-gray-500 mt-1">
          Position will be liquidated if price {positionType === 'LONG' ? 'drops below' : 'rises above'} this level
        </p>
      </div>

      {/* Risk Warning for High Leverage */}
      {isHighRisk && (
        <motion.div
          className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 flex items-start gap-3"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring' }}
        >
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-semibold text-sm">High Risk Warning</p>
            <p className="text-red-300/80 text-xs mt-1">
              {leverage}x leverage is extremely risky. Small price movements can result in liquidation.
            </p>
          </div>
        </motion.div>
      )}

      {/* Margin Required */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Required Margin</span>
        <span className="text-white font-semibold">
          ${(useTradingStore.getState().amount / leverage).toFixed(2)}
        </span>
      </div>
    </div>
  );
}
