// Position Display with Real-time PnL
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, X, AlertTriangle } from 'lucide-react';
import { useTradingStore } from '../../../stores/tradingStore';

interface PositionCardProps {
  position: {
    id: string;
    type: 'LONG' | 'SHORT';
    entry_price: number;
    amount: number;
    current_price: number;
    pnl: number;
    pnl_percent: number;
    leverage?: number;
    liquidation_price?: number;
    opened_at: string;
  };
  onClose: (id: string) => void;
  isLoading: boolean;
}

function PositionCard({ position, onClose, isLoading }: PositionCardProps) {
  const isProfit = position.pnl >= 0;
  const pnlColor = isProfit ? 'text-green-400' : 'text-red-400';
  const pnlBg = isProfit ? 'from-green-900/30 to-green-800/20' : 'from-red-900/30 to-red-800/20';

  return (
    <motion.div
      className={`bg-gradient-to-br ${pnlBg} border border-gray-700 rounded-xl p-4`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      layout
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded text-xs font-bold ${
            position.type === 'LONG' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {position.type}
          </div>
          {position.leverage && (
            <span className="text-xs text-gray-400">{position.leverage}x</span>
          )}
        </div>
        <motion.button
          onClick={() => onClose(position.id)}
          className="w-8 h-8 bg-gray-800 hover:bg-red-600/20 rounded-lg flex items-center justify-center transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          disabled={isLoading}
        >
          <X className="w-4 h-4 text-gray-400" />
        </motion.button>
      </div>

      {/* Price Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Entry Price</p>
          <p className="text-white font-semibold">${position.entry_price.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Mark Price</p>
          <p className="text-white font-semibold">${position.current_price.toFixed(4)}</p>
        </div>
      </div>

      {/* Liquidation Price */}
      {position.liquidation_price && (
        <div className="bg-gray-800/50 rounded-lg p-2 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-orange-400" />
              <span className="text-xs text-gray-500">Liquidation</span>
            </div>
            <span className="text-orange-400 text-xs font-semibold">
              ${position.liquidation_price.toFixed(4)}
            </span>
          </div>
        </div>
      )}

      {/* PnL Display */}
      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isProfit ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
            <span className="text-gray-400 text-xs">Unrealized PnL</span>
          </div>
          <motion.div
            key={position.pnl}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-right"
          >
            <p className={`text-xl font-bold ${pnlColor}`}>
              {isProfit ? '+' : ''}{position.pnl.toFixed(2)} PHON
            </p>
            <p className={`text-xs ${pnlColor}`}>
              {isProfit ? '+' : ''}{position.pnl_percent.toFixed(2)}%
            </p>
          </motion.div>
        </div>
      </div>

      {/* Position Size */}
      <div className="mt-3 text-xs text-gray-500 text-right">
        Size: {position.amount.toFixed(2)} PHON
      </div>
    </motion.div>
  );
}

export function PositionDisplay() {
  const { positions, closePosition, isLoading } = useTradingStore();

  if (positions.length === 0) {
    return (
      <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6 text-center">
        <p className="text-gray-500 text-sm">No open positions</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold">Open Positions</h3>
        <span className="text-xs text-gray-500">{positions.length} active</span>
      </div>

      <div className="space-y-3">
        {positions.map((position) => (
          <PositionCard
            key={position.id}
            position={position}
            onClose={closePosition}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}
