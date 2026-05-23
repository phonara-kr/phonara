import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const STREAK_MULTIPLIER = {
  1: 10,
  2: 12,
  3: 15,
  4: 18,
  5: 22,
  6: 28,
  7: 50,
};

function getRewardForStreak(streak: number): number {
  const cappedStreak = Math.min(streak, 7);
  return STREAK_MULTIPLIER[cappedStreak as keyof typeof STREAK_MULTIPLIER] || 10;
}

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const lastStreakDate = profile.last_streak_date
      ? new Date(profile.last_streak_date).toISOString().split('T')[0]
      : null;

    if (lastStreakDate === today) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Already claimed today',
          streak: profile.streak_days,
          nextClaimAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const newStreak = lastStreakDate === yesterday
      ? profile.streak_days + 1
      : 1;

    const reward = getRewardForStreak(newStreak);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        streak_days: newStreak,
        last_streak_date: today,
        total_rewards_earned: profile.total_rewards_earned + reward,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update streak' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { error: rewardError } = await supabase
      .from('rewards')
      .insert({
        user_id: user.id,
        type: newStreak === 7 ? 'STREAK_BONUS' : 'DAILY_CLAIM',
        amount: reward,
        multiplier: newStreak,
        metadata: { streak: newStreak },
      });

    if (rewardError) {
      console.error('Failed to create reward record:', rewardError);
    }

    const { data: currentWallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();

    const newBalance = (currentWallet?.balance || 0) + reward;

    const { error: balanceError } = await supabase
      .from('wallets')
      .update({
        balance: newBalance,
        total_earned: supabase.rpc('increment', { amount: reward }),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (balanceError) {
      const { error: manualUpdateError } = await supabase
        .from('wallets')
        .update({
          balance: newBalance,
          total_earned: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (manualUpdateError) {
        console.error('Failed to update wallet:', manualUpdateError);
      }
    }

    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'DAILY_CLAIM',
        amount: reward,
        balance_after: newBalance,
        description: `Daily claim - Day ${newStreak} streak`,
      });

    if (txError) {
      console.error('Failed to create transaction:', txError);
    }

    await supabase.from('events').insert({
      event_type: 'REWARD_GRANTED',
      user_id: user.id,
      payload: {
        type: 'DAILY_CLAIM',
        amount: reward,
        streak: newStreak,
      },
    });

    await supabase.from('events').insert({
      event_type: 'STREAK_UPDATED',
      user_id: user.id,
      payload: {
        old_streak: profile.streak_days,
        new_streak: newStreak,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        reward,
        streak: newStreak,
        balance: newBalance,
        isStreakBonus: newStreak === 7,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Daily claim error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
