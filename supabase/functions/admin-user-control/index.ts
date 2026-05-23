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

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (adminError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const targetUserId = url.searchParams.get('user_id');

      if (targetUserId) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*, wallet:wallets(*)')
          .eq('id', targetUserId)
          .maybeSingle();

        return new Response(
          JSON.stringify({ profile }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          streak_days,
          total_rewards_earned,
          level,
          is_frozen,
          created_at,
          wallet:wallets(balance, total_earned, total_spent)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (profilesError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch users' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({ users: profiles }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { action, target_user_id, amount, reason } = body;

      if (!action || !target_user_id) {
        return new Response(
          JSON.stringify({ error: 'Action and target_user_id required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      let result: any = { success: false };

      switch (action) {
        case 'freeze':
          await supabase
            .from('profiles')
            .update({ is_frozen: true })
            .eq('id', target_user_id);
          result = { success: true, action: 'frozen' };
          break;

        case 'unfreeze':
          await supabase
            .from('profiles')
            .update({ is_frozen: false })
            .eq('id', target_user_id);
          result = { success: true, action: 'unfrozen' };
          break;

        case 'adjust_balance':
          if (amount === undefined) {
            return new Response(
              JSON.stringify({ error: 'Amount required for balance adjustment' }),
              {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          const { data: currentWallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', target_user_id)
            .maybeSingle();

          const newBalance = (currentWallet?.balance || 0) + amount;

          await supabase
            .from('wallets')
            .update({ balance: newBalance })
            .eq('user_id', target_user_id);

          await supabase.from('transactions').insert({
            user_id: target_user_id,
            type: 'ADMIN_ADJUSTMENT',
            amount,
            balance_after: newBalance,
            description: reason || 'Admin adjustment',
          });

          result = { success: true, new_balance: newBalance };
          break;

        default:
          return new Response(
            JSON.stringify({ error: 'Invalid action' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
      }

      await supabase.from('admin_actions').insert({
        admin_user_id: adminUser.id,
        target_user_id,
        action_type: action,
        action_details: { amount, reason },
      });

      await supabase.from('events').insert({
        event_type: 'ADMIN_ACTION',
        user_id: user.id,
        payload: { action, target_user_id, amount },
      });

      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Admin user control error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
