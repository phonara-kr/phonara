// Trade Page - Simple Simulated Trading with Leverage
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTradingStore } from '../stores/tradingStore';
import { Layout, Header } from '../shared/ui/Layout';
import { PriceChart } from '../features/trading/ui/PriceChart';
import { TradingPanel } from '../features/trading/ui/TradingPanel';
import { PositionDisplay } from '../features/trading/ui/PositionDisplay';

export function TradePage() {
  const { startPolling, stopPolling, fetchPositions } = useTradingStore();

  useEffect(() => {
    startPolling();
    fetchPositions();

    return () => stopPolling();
  }, []);

  return (
    <Layout>
      <Header title="Trade" subtitle="Simple Simulated Trading" />

      <div className="space-y-4">
        {/* Price Chart */}
        <PriceChart />

        {/* Positions */}
        <PositionDisplay />

        {/* Trading Panel */}
        <TradingPanel />

        {/* Disclaimer */}
        <motion.div
          className="bg-yellow-900/10 border border-yellow-500/20 rounded-xl p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-gray-400 text-xs text-center">
            Simulated trading with virtual PHON tokens. Not real money.
            Leverage trading carries high risk of liquidation.
          </p>
        </motion.div>
      </div>
    </Layout>
  );
}
