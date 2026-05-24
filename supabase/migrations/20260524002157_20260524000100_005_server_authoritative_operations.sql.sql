/*
  # PHONARA V2 Server-Authoritative Operations
  
  ALL BALANCE CHANGES MUST GO THROUGH THESE FUNCTIONS.
  NO DIRECT CLIENT WRITES TO WALLETS TABLE.
  
  FUNCTIONS:
  1. claim_daily_reward() - Daily attendance with streak calculation
  2. open_mystery_box() - Mystery box reward distribution
  3. complete_onboarding_step() - Onboarding progression
  4. claim_mission_reward() - Mission completion rewards
  5. grant_referral_bonus() - Referral system rewards
*/

-- ============================================
-- DAILY CLAIM SYSTEM WITH STREAKS
-- ============================================

CREATE OR REPLACE FUNCTION public.claim_daily_reward(p_user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_balance DECIMAL(20,8);
  v_streak INTEGER;
  v_reward_amount DECIMAL(20,8);
  v_last_claim DATE;
  v_today DATE := CURRENT_DATE;
  v_multiplier DECIMAL(5,2) := 1.0;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot claim rewards for other users';
  END IF;
  
  SELECT streak_days, last_streak_date INTO v_streak, v_last_claim
  FROM public.profiles WHERE id = p_user_id;
  
  IF v_last_claim IS NULL THEN
    v_last_claim := v_today - INTERVAL '2 days';
  END IF;
  
  IF v_last_claim = v_today THEN
    RAISE EXCEPTION 'Already claimed today';
  END IF;
  
  IF v_last_claim = v_today - INTERVAL '1 day' THEN
    v_streak := v_streak + 1;
  ELSIF v_last_claim < v_today - INTERVAL '1 day' THEN
    v_streak := 1;
  END IF;
  
  v_reward_amount := 10.0 + (LEAST(v_streak, 6) - 1) * 5.0;
  
  IF v_streak % 7 = 0 THEN
    v_reward_amount := v_reward_amount * 2.0;
    v_multiplier := 2.0;
  END IF;
  
  UPDATE public.profiles 
  SET 
    streak_days = v_streak,
    last_streak_date = v_today,
    total_rewards_earned = total_rewards_earned + v_reward_amount,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  UPDATE public.wallets 
  SET 
    balance = balance + v_reward_amount,
    total_earned = total_earned + v_reward_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_current_balance;
  
  INSERT INTO public.transactions (user_id, type, amount, balance_after, description)
  VALUES (
    p_user_id, 
    'DAILY_CLAIM', 
    v_reward_amount, 
    v_current_balance, 
    'Daily claim - Day ' || v_streak
  );
  
  INSERT INTO public.rewards (user_id, type, amount, multiplier, metadata)
  VALUES (
    p_user_id, 
    'DAILY_CLAIM', 
    v_reward_amount, 
    v_multiplier,
    jsonb_build_object('streak', v_streak, 'is_weekly_bonus', v_streak % 7 = 0)
  );
  
  INSERT INTO public.events (event_type, user_id, payload)
  VALUES (
    'STREAK_UPDATED',
    p_user_id,
    jsonb_build_object('streak_days', v_streak, 'reward_amount', v_reward_amount)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'reward_amount', v_reward_amount,
    'new_streak', v_streak,
    'new_balance', v_current_balance,
    'is_weekly_bonus', v_streak % 7 = 0,
    'multiplier', v_multiplier
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MYSTERY BOX OPENING SYSTEM
-- ============================================

CREATE OR REPLACE FUNCTION public.open_mystery_box(p_user_id UUID, p_box_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tier TEXT;
  v_reward DECIMAL(20,8);
  v_new_balance DECIMAL(20,8);
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot open boxes for other users';
  END IF;
  
  SELECT reward_tier INTO v_tier
  FROM public.mystery_boxes
  WHERE id = p_box_id AND user_id = p_user_id AND is_opened = false
  FOR UPDATE;
  
  IF v_tier IS NULL THEN
    RAISE EXCEPTION 'Mystery box not found or already opened';
  END IF;
  
  v_reward := CASE v_tier
    WHEN 'COMMON' THEN 5.0 + (random() * 15.0)
    WHEN 'RARE' THEN 20.0 + (random() * 30.0)
    WHEN 'EPIC' THEN 50.0 + (random() * 50.0)
    WHEN 'LEGENDARY' THEN 100.0 + (random() * 100.0)
  END;
  
  v_reward := ROUND(v_reward, 2);
  
  UPDATE public.mystery_boxes
  SET 
    is_opened = true,
    opened_at = NOW(),
    reward_amount = v_reward
  WHERE id = p_box_id;
  
  UPDATE public.wallets
  SET 
    balance = balance + v_reward,
    total_earned = total_earned + v_reward,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
  VALUES (
    p_user_id, 
    'MYSTERY_BOX', 
    v_reward, 
    v_new_balance, 
    'Mystery box reward - ' || v_tier, 
    p_box_id
  );
  
  INSERT INTO public.rewards (user_id, type, amount, metadata)
  VALUES (
    p_user_id, 
    'MYSTERY_BOX', 
    v_reward, 
    jsonb_build_object('tier', v_tier, 'box_id', p_box_id)
  );
  
  INSERT INTO public.events (event_type, user_id, payload)
  VALUES (
    'MYSTERY_BOX_OPENED',
    p_user_id,
    jsonb_build_object('tier', v_tier, 'reward', v_reward, 'box_id', p_box_id)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'tier', v_tier,
    'reward', v_reward,
    'new_balance', v_new_balance,
    'box_id', p_box_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ONBOARDING COMPLETION SYSTEM
-- ============================================

CREATE OR REPLACE FUNCTION public.complete_onboarding_step(p_user_id UUID, p_step INTEGER)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_step INTEGER;
  v_new_step INTEGER;
  v_is_completed BOOLEAN;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot complete onboarding for other users';
  END IF;
  
  SELECT onboarding_step INTO v_current_step
  FROM public.profiles WHERE id = p_user_id;
  
  IF v_current_step IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  
  IF p_step != v_current_step + 1 THEN
    RAISE EXCEPTION 'Invalid onboarding step sequence';
  END IF;
  
  v_new_step := p_step;
  v_is_completed := v_new_step >= 4;
  
  UPDATE public.profiles
  SET 
    onboarding_step = v_new_step,
    onboarding_completed = v_is_completed,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  INSERT INTO public.events (event_type, user_id, payload)
  VALUES (
    'ONBOARDING_STEP',
    p_user_id,
    jsonb_build_object('step', v_new_step, 'completed', v_is_completed)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'step', v_new_step,
    'completed', v_is_completed
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MISSION REWARD CLAIM SYSTEM
-- ============================================

CREATE OR REPLACE FUNCTION public.claim_mission_reward(p_user_id UUID, p_mission_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reward DECIMAL(20,8);
  v_mission_type TEXT;
  v_new_balance DECIMAL(20,8);
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot claim missions for other users';
  END IF;
  
  SELECT reward, mission_type INTO v_reward, v_mission_type
  FROM public.missions
  WHERE id = p_mission_id AND user_id = p_user_id AND is_completed = true;
  
  IF v_reward IS NULL THEN
    RAISE EXCEPTION 'Mission not found, not completed, or already claimed';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM public.transactions 
    WHERE user_id = p_user_id AND reference_id = p_mission_id AND type = 'MISSION'
  ) THEN
    RAISE EXCEPTION 'Mission reward already claimed';
  END IF;
  
  UPDATE public.wallets
  SET 
    balance = balance + v_reward,
    total_earned = total_earned + v_reward,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
  VALUES (
    p_user_id, 
    'MISSION', 
    v_reward, 
    v_new_balance, 
    'Mission reward - ' || v_mission_type, 
    p_mission_id
  );
  
  INSERT INTO public.rewards (user_id, type, amount, metadata)
  VALUES (
    p_user_id, 
    'MISSION', 
    v_reward, 
    jsonb_build_object('mission_id', p_mission_id, 'mission_type', v_mission_type)
  );
  
  INSERT INTO public.events (event_type, user_id, payload)
  VALUES (
    'MISSION_COMPLETED',
    p_user_id,
    jsonb_build_object('mission_id', p_mission_id, 'reward', v_reward)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'reward', v_reward,
    'mission_type', v_mission_type,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- REFERRAL BONUS SYSTEM
-- ============================================

CREATE OR REPLACE FUNCTION public.grant_referral_bonus(
  p_referrer_id UUID,
  p_referee_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_referrer_balance DECIMAL(20,8);
  v_bonus_amount DECIMAL(20,8) := 50.0;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.referrals 
    WHERE referrer_id = p_referrer_id AND referee_id = p_referee_id AND reward_granted = true
  ) THEN
    RAISE EXCEPTION 'Referral bonus already granted';
  END IF;
  
  INSERT INTO public.referrals (referrer_id, referee_id, reward_granted, reward_amount)
  VALUES (p_referrer_id, p_referee_id, true, v_bonus_amount)
  ON CONFLICT (referrer_id, referee_id) 
  DO UPDATE SET reward_granted = true;
  
  UPDATE public.wallets
  SET 
    balance = balance + v_bonus_amount,
    total_earned = total_earned + v_bonus_amount,
    updated_at = NOW()
  WHERE user_id = p_referrer_id
  RETURNING balance INTO v_referrer_balance;
  
  INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
  VALUES (
    p_referrer_id, 
    'REFERRAL_BONUS', 
    v_bonus_amount, 
    v_referrer_balance, 
    'Referral bonus - New user joined', 
    p_referee_id
  );
  
  UPDATE public.profiles
  SET 
    total_rewards_earned = total_rewards_earned + v_bonus_amount,
    updated_at = NOW()
  WHERE id = p_referrer_id;
  
  INSERT INTO public.rewards (user_id, type, amount, metadata)
  VALUES (
    p_referrer_id, 
    'REFERRAL', 
    v_bonus_amount, 
    jsonb_build_object('referee_id', p_referee_id)
  );
  
  INSERT INTO public.events (event_type, user_id, payload)
  VALUES (
    'REFERRAL_MADE',
    p_referrer_id,
    jsonb_build_object('referee_id', p_referee_id, 'bonus_amount', v_bonus_amount)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', p_referrer_id,
    'referee_id', p_referee_id,
    'bonus_amount', v_bonus_amount,
    'referrer_new_balance', v_referrer_balance
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER: CHECK IF USER CAN CLAIM TODAY
-- ============================================

CREATE OR REPLACE FUNCTION public.can_claim_today(p_user_id UUID)
RETURNS JSONB
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_last_claim DATE;
  v_can_claim BOOLEAN;
BEGIN
  SELECT last_streak_date INTO v_last_claim
  FROM public.profiles WHERE id = p_user_id;
  
  v_can_claim := (v_last_claim IS NULL OR v_last_claim < CURRENT_DATE);
  
  RETURN jsonb_build_object(
    'can_claim', v_can_claim,
    'last_claim_date', v_last_claim,
    'today', CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql;