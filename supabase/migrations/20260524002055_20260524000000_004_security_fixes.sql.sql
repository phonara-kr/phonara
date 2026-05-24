/*
  # PHONARA V2 Security Fixes
  
  CRITICAL SECURITY ISSUES FIXED:
  
  1. SEARCH PATH MUTABLE WARNINGS
     - All functions now have SET search_path = '' to prevent SQL injection
     - Functions fixed: handle_updated_at, handle_new_user, get_simulated_price, emit_event, update_user_balance
  
  2. EVENTS TABLE RLS POLICY
     - OLD: WITH CHECK (true) - ANY authenticated user could insert events for ANY user_id
     - NEW: WITH CHECK (auth.uid() = user_id OR user_id IS NULL) - Users can only insert own events
     - Prevents event forgery and audit trail manipulation
  
  3. SECURITY DEFINER FUNCTIONS
     - emit_event: Changed to SECURITY INVOKER with user_id validation
     - update_user_balance: Changed to SECURITY INVOKER with user_id validation
     - handle_new_user: Kept SECURITY DEFINER (trigger function) with search_path protection
  
  4. MISSING RLS POLICIES
     - user_activity_logs: Added user isolation and admin access policies
     - funnel_events: Added user isolation and admin access policies
  
  5. EXECUTION PERMISSIONS
     - Revoked execute permissions from anon for sensitive functions
     - Only authenticated and service_role can execute balance/event functions
*/

-- ============================================
-- FIX 1: SEARCH PATH PROTECTION FOR ALL FUNCTIONS
-- ============================================

-- Fix handle_updated_at - Add search_path protection
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix get_simulated_price - Add search_path protection
CREATE OR REPLACE FUNCTION public.get_simulated_price()
RETURNS DECIMAL(20, 8) 
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  base_price DECIMAL(20, 8) := 100.0;
  volatility DECIMAL(10, 8) := 0.02;
  change DECIMAL(20, 8);
BEGIN
  change := (random() - 0.5) * 2 * volatility;
  RETURN base_price * (1 + change);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FIX 2: EVENTS TABLE RLS POLICY
-- ============================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Users can insert events" ON public.events;

-- Create secure policy - users can only insert events for themselves
CREATE POLICY "Users can insert own events only"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ============================================
-- FIX 3: SECURITY DEFINER FUNCTIONS WITH ACCESS CONTROL
-- ============================================

-- emit_event - Change to SECURITY INVOKER with validation
CREATE OR REPLACE FUNCTION public.emit_event(
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'
)
RETURNS UUID 
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Only allow service_role or user inserting their own events
  IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
    IF p_user_id IS NOT NULL AND p_user_id != auth.uid() THEN
      RAISE EXCEPTION 'Cannot emit events for other users';
    END IF;
  END IF;
  
  INSERT INTO public.events (event_type, user_id, payload)
  VALUES (p_event_type, p_user_id, p_payload)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- update_user_balance - SECURITY INVOKER with proper validation
CREATE OR REPLACE FUNCTION public.update_user_balance(
  p_user_id UUID,
  p_amount DECIMAL(20, 8),
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS DECIMAL(20, 8) 
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  new_balance DECIMAL(20, 8);
BEGIN
  -- Validate user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Only allow service_role or the user themselves
  IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
    IF p_user_id != auth.uid() THEN
      RAISE EXCEPTION 'Cannot update balance for other users';
    END IF;
  END IF;
  
  -- Update wallet
  UPDATE public.wallets
  SET 
    balance = balance + p_amount,
    total_earned = CASE WHEN p_amount > 0 THEN total_earned + p_amount ELSE total_earned END,
    total_spent = CASE WHEN p_amount < 0 THEN total_spent + ABS(p_amount) ELSE total_spent END,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO new_balance;
  
  -- Create transaction record
  INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
  VALUES (p_user_id, p_type, p_amount, new_balance, p_description, p_reference_id);
  
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- handle_new_user - Add search_path (must keep SECURITY DEFINER for trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, username, referral_code)
  VALUES (NEW.id, NEW.email, encode(gen_random_bytes(8), 'hex'));
  
  -- Create wallet with welcome bonus
  INSERT INTO public.wallets (user_id, balance, total_earned)
  VALUES (NEW.id, 100, 100);
  
  -- Create welcome bonus reward
  INSERT INTO public.rewards (user_id, type, amount, metadata)
  VALUES (NEW.id, 'WELCOME_BONUS', 100, '{"source": "signup"}');
  
  -- Create transaction record
  INSERT INTO public.transactions (user_id, type, amount, balance_after, description)
  VALUES (NEW.id, 'REWARD', 100, 100, 'Welcome bonus');
  
  -- Create leaderboard entry
  INSERT INTO public.leaderboard_entries (user_id, username, total_rewards)
  VALUES (NEW.id, NEW.email, 100);
  
  -- Emit signup event directly
  INSERT INTO public.events (event_type, user_id)
  VALUES ('USER_SIGNUP', NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FIX 4: ADD RLS POLICIES FOR user_activity_logs
-- ============================================

-- Users can view own activity logs
CREATE POLICY "Users can view own activity logs"
  ON public.user_activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert own activity logs
CREATE POLICY "Users can insert own activity logs"
  ON public.user_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs"
  ON public.user_activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
  );

-- ============================================
-- FIX 5: ADD RLS POLICIES FOR funnel_events
-- ============================================

-- Users can view own funnel events
CREATE POLICY "Users can view own funnel events"
  ON public.funnel_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert own funnel events
CREATE POLICY "Users can insert own funnel events"
  ON public.funnel_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all funnel events (already exists but ensure it's there)
DROP POLICY IF EXISTS "Admins can view all funnel_events" ON public.funnel_events;
CREATE POLICY "Admins can view all funnel events"
  ON public.funnel_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
  );

-- ============================================
-- FIX 6: REVOKE EXECUTE PERMISSIONS FROM ANON
-- ============================================

REVOKE EXECUTE ON FUNCTION public.emit_event(TEXT, UUID, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_user_balance(UUID, DECIMAL(20,8), TEXT, TEXT, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_simulated_price() FROM anon;