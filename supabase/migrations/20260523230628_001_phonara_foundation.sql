/*
  # PHONARA V2 Foundation Tables
  
  1. Core Tables
    - profiles: User profiles linked to auth.users
    - wallets: PHON token balance tracking
    - transactions: Immutable transaction ledger
    - rewards: Reward history and claims
    - referrals: Viral referral system
    
  2. Event System
    - events: Immutable append-only event log
    - funnel_events: Conversion tracking
    - user_activity_logs: Analytics data
    
  3. Security
    - RLS enabled on ALL tables
    - Strict user isolation
*/

-- ============================================
-- PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  avatar_url TEXT,
  referral_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  referred_by UUID REFERENCES auth.users(id),
  streak_days INTEGER DEFAULT 0,
  last_streak_date DATE,
  total_rewards_earned DECIMAL(20, 8) DEFAULT 0,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  is_frozen BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Index for referral lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- ============================================
-- WALLETS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(20, 8) DEFAULT 0 CHECK (balance >= 0),
  locked_balance DECIMAL(20, 8) DEFAULT 0 CHECK (locked_balance >= 0),
  total_earned DECIMAL(20, 8) DEFAULT 0,
  total_spent DECIMAL(20, 8) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Wallet policies
CREATE POLICY "Users can view own wallet"
  ON public.wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- TRANSACTIONS TABLE (IMMUTABLE)
-- ============================================

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'REWARD', 'REFERRAL_BONUS', 'TRADING_PROFIT', 'TRADING_LOSS', 'MISSION', 'DAILY_CLAIM', 'MYSTERY_BOX', 'MINIGAME', 'ADMIN_ADJUSTMENT')),
  amount DECIMAL(20, 8) NOT NULL,
  balance_after DECIMAL(20, 8) NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Transaction policies
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for transaction queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- ============================================
-- REWARDS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('DAILY_CLAIM', 'STREAK_BONUS', 'MISSION', 'REFERRAL', 'MYSTERY_BOX', 'MINIGAME', 'WELCOME_BONUS', 'NEAR_MISS_BONUS')),
  amount DECIMAL(20, 8) NOT NULL,
  multiplier DECIMAL(5, 2) DEFAULT 1.0,
  metadata JSONB DEFAULT '{}',
  claimed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- Rewards policies
CREATE POLICY "Users can view own rewards"
  ON public.rewards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rewards"
  ON public.rewards FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- REFERRALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_granted BOOLEAN DEFAULT false,
  reward_amount DECIMAL(20, 8) DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referee_id)
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Referrals policies
CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "Users can insert referrals"
  ON public.referrals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- ============================================
-- EVENTS TABLE (IMMUTABLE APPEND-ONLY)
-- ============================================

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('USER_LOGIN', 'USER_SIGNUP', 'USER_LOGOUT', 'REWARD_GRANTED', 'ORDER_CREATED', 'ORDER_FILLED', 'ORDER_CANCELLED', 'TRADE_EXECUTED', 'POSITION_OPENED', 'POSITION_CLOSED', 'STREAK_UPDATED', 'REFERRAL_MADE', 'REFERRAL_CLICKED', 'ADMIN_ACTION', 'ONBOARDING_STEP', 'MISSION_COMPLETED', 'MYSTERY_BOX_OPENED', 'MINIGAME_PLAYED', 'WALLET_ADJUSTMENT')),
  user_id UUID REFERENCES auth.users(id),
  payload JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Users can insert events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own events"
  ON public.events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for event queries
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);

-- ============================================
-- FUNNEL EVENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  funnel_stage TEXT NOT NULL,
  event_name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER ACTIVITY LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  page TEXT,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE OR REPLACE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER handle_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to create wallet on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
  
  -- Emit signup event
  INSERT INTO public.events (event_type, user_id)
  VALUES ('USER_SIGNUP', NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;