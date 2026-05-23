import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTradingStore } from '../stores/tradingStore';
import { useAuthStore } from '../stores/authStore';
import { Layout, Header } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { AnimatedNumber } from '../shared/ui/CountUp';
import { staggerContainer, staggerItem } from '../lib/animations';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function TradePage() {
  const { wallet } = useAuthStore();
  const {
    currentPrice,
    priceHistory,
    orderBook,
    positions,
    isLoading,
    placeOrder,
    closePosition,
    startPolling,
    stopPolling,
    fetchPositions,
  } = useTradingStore();

  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeType, setTradeType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');

  useEffect(() => {
    startPolling();
    fetchPositions();

    return () => stopPolling();
  }, []);

  useEffect(() => {
    if (tradeType === 'LIMIT') {
      setLimitPrice(currentPrice.toFixed(2));
    }
  }, [currentPrice, tradeType]);

  const handlePlaceOrder = async () => {
    const orderAmount = parseFloat(amount);
    if (isNaN(orderAmount) || orderAmount <= 0) return;

    const price = tradeType === 'MARKET' ? currentPrice : parseFloat(limitPrice);

    await placeOrder(orderType, tradeType, price, orderAmount);
    setAmount('');
  };

  const totalPositions = positions.length;
  const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <Layout>
      <Header title="Trade" subtitle="Simulated PHON/USD Trading" />

      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItem}>
          <Card className="p-4 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-400 text-sm">PHON/USD</p>
                <motion.p
                  className="text-3xl font-bold mt-1"
                  key={currentPrice}
                  initial={{ scale: 1.1, color: '#3b82f6' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  transition={{ duration: 0.3 }}
                >
                  $<AnimatedNumber value={currentPrice} decimals={4} />
                </motion.p>
              </div>

              <div className="text-right">
                <p
                  className={`text-lg font-semibold ${
                    priceHistory[0]?.changePercent >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {priceHistory[0]?.changePercent >= 0 ? '+' : ''}
                  <AnimatedNumber
                    value={priceHistory[0]?.changePercent || 0}
                    decimals={2}
                  />
                  %
                </p>
                <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                  {priceHistory[0]?.changePercent >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  )}
                  <span>
                    {priceHistory[0]?.changePercent >= 0 ? 'Up' : 'Down'}
                  </span>
                </div>
              </div>
            </div>

            <div className="h-32 flex items-end gap-0.5">
              {priceHistory.slice(0, 50).reverse().map((p, i) => {
                const maxChange = Math.max(
                  ...priceHistory.map((h) => Math.abs(h.changePercent))
                );
                const height = (Math.abs(p.changePercent) / maxChange) * 100;

                return (
                  <motion.div
                    key={i}
                    className={`flex-1 rounded-t ${
                      p.changePercent >= 0 ? 'bg-green-500/50' : 'bg-red-500/50'
                    }`}
                    style={{ height: `${Math.max(height, 5)}%` }}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(height, 5)}%` }}
                    transition={{ duration: 0.2, delay: i * 0.01 }}
                  />
                );
              })}
            </div>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={orderType === 'BUY' ? 'primary' : 'secondary'}
              onClick={() => setOrderType('BUY')}
              className="w-full"
            >
              Buy
            </Button>
            <Button
              variant={orderType === 'SELL' ? 'danger' : 'secondary'}
              onClick={() => setOrderType('SELL')}
              className="w-full"
            >
              Sell
            </Button>
          </div>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setTradeType('MARKET')}
                className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  tradeType === 'MARKET'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                Market
              </button>
              <button
                onClick={() => setTradeType('LIMIT')}
                className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  tradeType === 'LIMIT'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                Limit
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Amount (PHON)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map((percent) => (
                    <button
                      key={percent}
                      onClick={() =>
                        setAmount(
                          ((wallet?.balance || 0) * (percent / 100)).toFixed(2)
                        )
                      }
                      className="flex-1 py-1.5 bg-gray-800 rounded-lg text-xs text-gray-400 hover:bg-gray-700 transition-colors"
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
              </div>

              {tradeType === 'LIMIT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Limit Price (USD)
                  </label>
                  <input
                    type="number"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Available</span>
                  <span className="text-white font-medium">
                    {(wallet?.balance || 0).toFixed(2)} PHON
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-400">Est. Total</span>
                  <span className="text-white font-medium">
                    ${((parseFloat(amount) || 0) * currentPrice).toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handlePlaceOrder}
                isLoading={isLoading}
                className={`w-full ${
                  orderType === 'BUY'
                    ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                    : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                }`}
                size="lg"
              >
                {orderType === 'BUY' ? 'Buy PHON' : 'Sell PHON'}
              </Button>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <h3 className="text-lg font-semibold mb-3">Open Positions ({totalPositions})</h3>
          {positions.length > 0 ? (
            <div className="space-y-2">
              {positions.map((position) => (
                <Card key={position.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            position.type === 'LONG'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {position.type}
                        </span>
                        <span className="text-gray-400 text-sm">
                          Entry: ${position.entry_price.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-white mt-2">
                        Amount: {position.amount.toFixed(2)} PHON
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                      </p>
                      <p
                        className={`text-xs ${
                          position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {position.pnl_percent >= 0 ? '+' : ''}
                        {position.pnl_percent.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => closePosition(position.id)}
                    variant="secondary"
                    size="sm"
                    className="w-full mt-3"
                  >
                    Close Position
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center text-gray-500">
              No open positions. Start trading!
            </Card>
          )}
        </motion.div>

        <motion.div variants={staggerItem}>
          <h3 className="text-lg font-semibold mb-3">Order Book</h3>
          <Card className="p-0 overflow-hidden">
            <div className="grid grid-cols-2">
              <div className="border-r border-gray-800">
                <div className="p-2 bg-green-950/30 border-b border-gray-800 text-xs font-semibold text-green-400">
                  BIDS
                </div>
                <div className="divide-y divide-gray-800">
                  {orderBook.bids.slice(0, 5).map((bid, i) => (
                    <div
                      key={i}
                      className="flex justify-between p-2 text-xs hover:bg-gray-800/50 transition-colors"
                    >
                      <span className="text-green-400">
                        ${bid.price.toFixed(2)}
                      </span>
                      <span className="text-gray-400">{bid.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="p-2 bg-red-950/30 border-b border-gray-800 text-xs font-semibold text-red-400">
                  ASKS
                </div>
                <div className="divide-y divide-gray-800">
                  {orderBook.asks.slice(0, 5).map((ask, i) => (
                    <div
                      key={i}
                      className="flex justify-between p-2 text-xs hover:bg-gray-800/50 transition-colors"
                    >
                      <span className="text-red-400">
                        ${ask.price.toFixed(2)}
                      </span>
                      <span className="text-gray-400">{ask.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
