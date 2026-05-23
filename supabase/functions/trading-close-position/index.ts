import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await req.json();
    const { position_id, price } = body;

    if (!position_id) {
      return new Response(
        JSON.stringify({ error: 'Position ID required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { data: position, error: posError } = await supabase
      .from('positions')
      .select('*')
      .eq('id', position_id)
      .eq('user_id', user.id)
      .eq('status', 'OPEN')
      .maybeSingle();

    if (posError || !position) {
      return new Response(
        JSON.stringify({ error: 'Position not found or already closed' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const exitPrice = price || position.current_price;

    const pnl = position.type === 'LONG'
      ? (exitPrice - position.entry_price) * position.amount
      : (position.entry_price - exitPrice) * position.amount;

    const pnlPercent = position.type === 'LONG'
      ? ((exitPrice - position.entry_price) / position.entry_price) * 100
      : ((position.entry_price - exitPrice) / position.entry_price) * 100;

    const { error: updateError } = await supabase
      .from('positions')
      .update({
        status: 'CLOSED',
        pnl,
        pnl_percent: pnlPercent,
        current_price: exitPrice,
        closed_at: new Date().toISOString(),
      })
      .eq('id', position_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to close position' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const profit = position.amount + pnl;

    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();

    const newBalance = (wallet?.balance || 0) + profit;

    await supabase
      .from('wallets')
      .update({
        balance: newBalance,
        total_earned: pnl > 0 ? (wallet?.total_earned || 0) + pnl : wallet?.total_earned,
        total_spent: pnl < 0 ? (wallet?.total_spent || 0) + Math.abs(pnl) : wallet?.total_spent,
      })
      .eq('user_id', user.id);

    await supabase.from('transactions').insert({
      user_id: user.id,
      type: pnl >= 0 ? 'TRADING_PROFIT' : 'TRADING_LOSS',
      amount: pnl,
      balance_after: newBalance,
      description: `Position closed - ${position.type}`,
      reference_id: position_id,
    });

    await supabase.from('events').insert({
      event_type: 'POSITION_CLOSED',
      user_id: user.id,
      payload: {
        position_id,
        pnl,
        pnl_percent: pnlPercent,
        exit_price: exitPrice,
      },
    });

    await supabase.from('leaderboard_entries')
      .update({
        total_pnl: supabase.rpc('increment', { x: pnl }),
        total_trades: supabase.rpc('increment', { x: 1 }),
      })
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        pnl,
        pnl_percent: pnlPercent,
        balance: newBalance,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Close position error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
