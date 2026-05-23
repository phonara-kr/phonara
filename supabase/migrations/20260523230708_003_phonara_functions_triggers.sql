/*
  # PHONARA V2 Helper Functions and Triggers
  
  1. Price simulation function
  2. Event emission function
  3. Balance update function
  4. Admin policies
  5. User signup trigger
*/

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to generate simulated price
CREATE OR REPLACE FUNCTION public.get_simulated_price()
RETURNS DECIMAL(20, 8) AS $$
DECLARE
  base_price DECIMAL(20, 8) := 100.0;
  volatility DECIMAL(10, 8) := 0.02;
  change DECIMAL(20, 8);
BEGIN
  change := (random() - 0.5) * 2 * volatility;
  RETURN base_price * (1 + change);
END;
$$ LANGUAGE plpgsql;

-- Function to emit event
CREATE OR REPLACE FUNCTION public.emit_event(
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.events (event_type, user_id, payload)
  VALUES (p_event_type, p_user_id, p_payload)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user balance
CREATE OR REPLACE FUNCTION public.update_user_balance(
  p_user_id UUID,
  p_amount DECIMAL(20, 8),
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS DECIMAL(20, 8) AS $$
DECLARE
  new_balance DECIMAL(20, 8);
BEGIN
  -- Update wallet
  UPDATE public.wallets
  SET 
    balance = balance + p_amount,
    total_earned = CASE WHEN p_amount > 0 THEN total_earned + p_amount ELSE total_earned END,
    total_spent = CASE WHEN p_amount < 0 THEN total_spent + ABS(p_amount) ELSE total_spent END,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO new_balance;
  
  -- Create transaction
  INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
  VALUES (p_user_id, p_type, p_amount, new_balance, p_description, p_reference_id);
  
  -- Emit event
  PERFORM public.emit_event(
    'WALLET_ADJUSTMENT',
    p_user_id,
    jsonb_build_object('amount', p_amount, 'type', p_type, 'balance', new_balance)
  );
  
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADMIN POLICIES
-- ============================================

-- Admin users can see all admin_users
CREATE POLICY "Admins can view admin_users"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid() 
      AND au.is_active = true
    ) OR user_id = auth.uid()
  );

-- Admins can view all admin_actions
CREATE POLICY "Admins can view admin_actions"
  ON public.admin_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
  );

-- Admins can insert admin_actions
CREATE POLICY "Admins can insert admin_actions"
  ON public.admin_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
  );

-- Admin can view all wallets
CREATE POLICY "Admins can view all wallets"
  ON public.wallets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
    OR auth.uid() = user_id
  );

-- Admin can update all wallets
CREATE POLICY "Admins can update all wallets"
  ON public.wallets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
  );

-- Admin can view all orders
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
    OR auth.uid() = user_id
  );

-- Admin can view all events
CREATE POLICY "Admins can view all events"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
    OR auth.uid() = user_id
  );

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
    OR auth.uid() = id
  );

-- Admin can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
  );

-- Admin can view all funnel events
CREATE POLICY "Admins can view all funnel_events"
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
-- SIGNUP TRIGGER
-- ============================================

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ORDERS UPDATED AT TRIGGER
-- ============================================

CREATE OR REPLACE TRIGGER handle_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();