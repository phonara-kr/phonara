/*
  # PHONARA V2 Trading and Admin Tables
  
  1. Trading System (Simulated)
    - orders: Market/limit orders
    - positions: Open and closed positions
    - order_book: Price-time priority matching
    
  2. Admin System
    - admin_users: Admin role management
    - admin_actions: Audit trail
    
  3. Leaderboard
    - leaderboard_entries: Ranking data
    
  4. Engagement Systems
    - mystery_boxes: Mystery box rewards
    - missions: Mission tracking
    
  5. Security
    - RLS enabled on ALL tables
*/

-- ============================================
-- ORDERS TABLE (SIMULATED TRADING)
-- ============================================

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
  order_type TEXT NOT NULL CHECK (order_type IN ('MARKET', 'LIMIT')),
  price DECIMAL(20, 8) NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  filled_amount DECIMAL(20, 8) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Orders policies
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for order matching
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_price ON public.orders(price);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- ============================================
-- POSITIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  type TEXT NOT NULL CHECK (type IN ('LONG', 'SHORT')),
  entry_price DECIMAL(20, 8) NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  current_price DECIMAL(20, 8) NOT NULL,
  pnl DECIMAL(20, 8) DEFAULT 0,
  pnl_percent DECIMAL(10, 4) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'LIQUIDATED')),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- Positions policies
CREATE POLICY "Users can view own positions"
  ON public.positions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own positions"
  ON public.positions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own positions"
  ON public.positions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- ORDER BOOK TABLE (PRICE-TIME PRIORITY)
-- ============================================

CREATE TABLE IF NOT EXISTS public.order_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  price DECIMAL(20, 8) NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  remaining DECIMAL(20, 8) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.order_book ENABLE ROW LEVEL SECURITY;

-- Order book policies - public read for all authenticated
CREATE POLICY "Order book is readable by authenticated"
  ON public.order_book FOR SELECT
  TO authenticated
  USING (true);

-- Indexes for matching engine
CREATE INDEX IF NOT EXISTS idx_order_book_price_type ON public.order_book(price, type);
CREATE INDEX IF NOT EXISTS idx_order_book_priority ON public.order_book(priority);

-- ============================================
-- ADMIN USERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MODERATOR')),
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ADMIN ACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.admin_users(id),
  target_user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  action_details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- LEADERBOARD ENTRIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  total_pnl DECIMAL(20, 8) DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  total_rewards DECIMAL(20, 8) DEFAULT 0,
  rank INTEGER,
  period TEXT DEFAULT 'ALL_TIME' CHECK (period IN ('DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Leaderboard policies - public read
CREATE POLICY "Leaderboard is readable by authenticated"
  ON public.leaderboard_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own leaderboard"
  ON public.leaderboard_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- MYSTERY BOXES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.mystery_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_tier TEXT NOT NULL CHECK (reward_tier IN ('COMMON', 'RARE', 'EPIC', 'LEGENDARY')),
  reward_amount DECIMAL(20, 8) NOT NULL,
  is_opened BOOLEAN DEFAULT false,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mystery_boxes ENABLE ROW LEVEL SECURITY;

-- Mystery boxes policies
CREATE POLICY "Users can view own mystery boxes"
  ON public.mystery_boxes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own mystery boxes"
  ON public.mystery_boxes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- MISSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_type TEXT NOT NULL CHECK (mission_type IN ('LOGIN_STREAK', 'TRADE_COUNT', 'REFERRAL_COUNT', 'TRADING_VOLUME', 'DAILY_CLAIM', 'FIRST_TRADE', 'FIRST_REFERRAL', 'OPEN_BOX', 'PLAY_GAME')),
  target INTEGER NOT NULL,
  progress INTEGER DEFAULT 0,
  reward DECIMAL(20, 8) NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- Missions policies
CREATE POLICY "Users can view own missions"
  ON public.missions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own missions"
  ON public.missions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own missions"
  ON public.missions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ADDITIONAL INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_positions_user_status ON public.positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON public.orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_missions_user_expired ON public.missions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_mystery_boxes_user_opened ON public.mystery_boxes(user_id, is_opened);