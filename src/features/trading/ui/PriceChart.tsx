// Price Chart with lightweight-charts
import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, LineSeries } from 'lightweight-charts';
import { useTradingStore } from '../../../stores/tradingStore';

export function PriceChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });

  const { priceHistory, currentPrice, positions } = useTradingStore();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      width: chartContainerRef.current.clientWidth,
      height: dimensions.height,
      rightPriceScale: {
        borderColor: '#334155',
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: false,
      },
      handleScale: false,
      handleScroll: false,
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = lineSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        const width = chartContainerRef.current.clientWidth;
        chart.applyOptions({ width });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (seriesRef.current && priceHistory.length > 0) {
      seriesRef.current.setData(priceHistory);
    }
  }, [priceHistory]);

  // Add entry price markers for open positions
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;

    positions.forEach((position) => {
      // Add a horizontal line at entry price
      // This would require additional lightweight-charts features
      // For now, we skip this feature
    });
  }, [positions]);

  // Update current price dot
  useEffect(() => {
    if (seriesRef.current && priceHistory.length > 0) {
      const latestData = priceHistory[priceHistory.length - 1];
      // Add a visual indicator for the current price
    }
  }, [currentPrice, priceHistory]);

  return (
    <div className="relative bg-gray-900/50 rounded-2xl overflow-hidden border border-gray-800">
      {/* Price Header */}
      <div className="absolute top-4 left-4 z-10">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">PHON/USD</p>
            <motion.p
              className="text-3xl font-bold text-white"
              key={currentPrice}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              ${currentPrice.toFixed(4)}
            </motion.p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500">24h Change</span>
            <p className={`text-sm font-semibold ${Math.random() > 0.5 ? 'text-green-400' : 'text-red-400'}`}>
              {(Math.random() * 4 - 2).toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} className="w-full h-[400px]" />

      {/* Price Scale Overlay */}
      <div className="absolute right-4 top-1/4 flex flex-col gap-8">
        {[currentPrice - 2, currentPrice - 1, currentPrice, currentPrice + 1, currentPrice + 2].map((price, idx) => (
          <span key={idx} className={`text-xs ${price === currentPrice ? 'text-blue-400 font-bold' : 'text-gray-600'}`}>
            ${price.toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  );
}
