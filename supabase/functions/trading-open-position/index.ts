import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAINTENANCE_MARGIN_RATE = 0.005; // 0.5%

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { position_type, entry_price, amount, leverage } = body;

    // Validation
    if (!position_type || !['LONG', 'SHORT'].includes(position_type)) {
      return new Response(JSON.stringify({ error: 'Invalid position type. Use LONG or SHORT.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!entry_price || entry_price <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid entry price' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!leverage || leverage < 1 || leverage > 100) {
      return new Response(JSON.stringify({ error: 'Invalid leverage. Must be between 1 and 100.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate margin and liquidation price
    const margin = amount / leverage;

    // Liquidation Price Calculation
    // Long: Entry Price × (1 - (1/Leverage) + Maintenance Margin Rate)
    // Short: Entry Price × (1 + (1/Leverage) - Maintenance Margin Rate)
    const liquidationPrice = position_type === 'LONG'
      ? entry_price * (1 - (1 / leverage) + MAINTENANCE_MARGIN_RATE)
      : entry_price * (1 + (1 / leverage) - MAINTENANCE_MARGIN_RATE);

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance, locked_balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: 'Wallet not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (wallet.balance < margin) {
      return new Response(JSON.stringify({
        error: 'Insufficient balance',
        required: margin,
        available: wallet.balance
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Deduct margin from wallet
    const { error: deductError } = await supabase
      .from('wallets')
      .update({
        balance: wallet.balance - margin,
        locked_balance: wallet.locked_balance + margin,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (deductError) {
      return new Response(JSON.stringify({ error: 'Failed to lock margin' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create position
    const { data: position, error: posError } = await supabase
      .from('positions')
      .insert({
        user_id: user.id,
        type: position_type,
        entry_price: entry_price,
        amount: amount,
        current_price: entry_price,
        pnl: 0,
        pnl_percent: 0,
        status: 'OPEN',
      })
      .select()
      .single();

    if (posError) {
      // Refund margin
      await supabase
        .from('wallets')
        .update({
          balance: wallet.balance,
          locked_balance: wallet.locked_balance
        })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({ error: 'Failed to create position' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create transaction record
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'TRADING_LOSS',
      amount: -margin,
      balance_after: wallet.balance - margin,
      description: `Position opened - ${position_type} ${leverage}x`,
      reference_id: position.id,
    });

    // Emit event
    await supabase.from('events').insert({
      event_type: 'POSITION_OPENED',
      user_id: user.id,
      payload: {
        position_id: position.id,
        type: position_type,
        entry_price: entry_price,
        amount: amount,
        leverage: leverage,
        margin: margin,
        liquidation_price: liquidationPrice,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      position: {
        id: position.id,
        type: position_type,
        entry_price: entry_price,
        amount: amount,
        leverage: leverage,
        margin: margin,
        liquidation_price: liquidationPrice,
        current_price: entry_price,
        pnl: 0,
        pnl_percent: 0,
      },
      wallet: {
        balance: wallet.balance - margin,
        locked_balance: wallet.locked_balance + margin,
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Open position error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});