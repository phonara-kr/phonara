import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

let lastPrice = 100.0;
let momentum = 0;
const volatility = 0.02;
const momentumDecay = 0.95;
const maxMomentum = 0.01;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const count = parseInt(url.searchParams.get('count') || '1');

    const prices: {
      price: number;
      change: number;
      changePercent: number;
      timestamp: string;
    }[] = [];

    for (let i = 0; i < count; i++) {
      const randomWalk = (Math.random() - 0.5) * 2 * volatility;

      momentum = momentum * momentumDecay + randomWalk * (1 - momentumDecay);
      momentum = Math.max(-maxMomentum, Math.min(maxMomentum, momentum));

      const trend = Math.sin(Date.now() / 10000) * 0.001;

      const change = lastPrice * (randomWalk + momentum + trend);
      const newPrice = Math.max(1, lastPrice + change);

      const priceData = {
        price: parseFloat(newPrice.toFixed(8)),
        change: parseFloat(change.toFixed(8)),
        changePercent: parseFloat(((change / lastPrice) * 100).toFixed(4)),
        timestamp: new Date().toISOString(),
      };

      prices.push(priceData);
      lastPrice = newPrice;
    }

    return new Response(
      JSON.stringify({
        prices,
        currentPrice: prices[prices.length - 1]?.price || lastPrice,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Price feed error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
