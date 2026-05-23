import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: buyOrders, error: buyError } = await supabase
      .from('order_book')
      .select('*')
      .eq('type', 'BUY')
      .gt('remaining', 0)
      .order('price', { ascending: false })
      .order('priority', { ascending: true })
      .limit(20);

    const { data: sellOrders, error: sellError } = await supabase
      .from('order_book')
      .select('*')
      .eq('type', 'SELL')
      .gt('remaining', 0)
      .order('price', { ascending: true })
      .order('priority', { ascending: true })
      .limit(20);

    if (buyError || sellError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch order book' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    interface OrderBookEntry {
      price: number;
      amount: number;
      count: number;
    }

    const aggregateOrders = (orders: any[]): OrderBookEntry[] => {
      const priceMap = new Map<number, { amount: number; count: number }>();

      orders?.forEach((order: any) => {
        const existing = priceMap.get(order.price) || { amount: 0, count: 0 };
        priceMap.set(order.price, {
          amount: existing.amount + order.remaining,
          count: existing.count + 1,
        });
      });

      return Array.from(priceMap.entries())
        .map(([price, data]) => ({
          price,
          amount: data.amount,
          count: data.count,
        }));
    };

    const bids = aggregateOrders(buyOrders || []);
    const asks = aggregateOrders(sellOrders || []);

    const bestBid = bids.length > 0 ? bids[0].price : 100;
    const bestAsk = asks.length > 0 ? asks[0].price : 100;
    const spread = bestAsk - bestBid;
    const midPrice = (bestBid + bestAsk) / 2;

    return new Response(
      JSON.stringify({
        bids,
        asks,
        spread,
        mid_price: midPrice,
        best_bid: bestBid,
        best_ask: bestAsk,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Get orderbook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
