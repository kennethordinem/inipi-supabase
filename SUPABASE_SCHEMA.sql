-- ============================================
-- INIPI SUPABASE DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE (User/Member data)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  member_since TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. EMPLOYEES TABLE (Staff/Gusmester)
-- ============================================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  title TEXT,
  points INTEGER DEFAULT 0,
  public_profile JSONB DEFAULT '{}',
  frontend_permissions JSONB DEFAULT '{"gusmester": false, "staff": false, "administration": false}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. GROUP TYPES TABLE (Session categories)
-- ============================================
CREATE TABLE group_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_private BOOLEAN DEFAULT false,
  minimum_seats INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. THEMES TABLE (Session themes)
-- ============================================
CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  color TEXT DEFAULT '#6366f1',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. SESSIONS TABLE (Sauna sessions/classes)
-- ============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INTEGER NOT NULL,
  max_participants INTEGER NOT NULL,
  current_participants INTEGER DEFAULT 0,
  max_spots_per_booking INTEGER,
  price DECIMAL(10,2) NOT NULL,
  location TEXT,
  group_type_id UUID REFERENCES group_types(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. SESSION_EMPLOYEES (Many-to-many)
-- ============================================
CREATE TABLE session_employees (
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, employee_id)
);

-- ============================================
-- 7. SESSION_THEMES (Many-to-many)
-- ============================================
CREATE TABLE session_themes (
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES themes(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, theme_id)
);

-- ============================================
-- 8. PUNCH CARDS TABLE (Klippekort)
-- ============================================
CREATE TABLE punch_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_punches INTEGER NOT NULL,
  remaining_punches INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  valid_for_group_types UUID[] DEFAULT '{}',
  expiry_date DATE,
  status TEXT DEFAULT 'active',
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. BOOKINGS TABLE (User bookings)
-- ============================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id),
  spots INTEGER NOT NULL DEFAULT 1,
  theme_id UUID REFERENCES themes(id),
  payment_method TEXT NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  payment_amount DECIMAL(10,2),
  punch_card_id UUID REFERENCES punch_cards(id),
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'confirmed',
  confirmation_number TEXT UNIQUE,
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. PUNCH CARD USAGE (History)
-- ============================================
CREATE TABLE punch_card_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  punch_card_id UUID REFERENCES punch_cards(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id),
  spots_used INTEGER NOT NULL,
  remaining_after INTEGER NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. PUNCH CARD ADJUSTMENTS (Manual changes)
-- ============================================
CREATE TABLE punch_card_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  punch_card_id UUID REFERENCES punch_cards(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  previous_remaining INTEGER NOT NULL,
  new_remaining INTEGER NOT NULL,
  adjusted_by UUID REFERENCES employees(id),
  adjusted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. INVOICES TABLE (Payment records)
-- ============================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  vat_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  booking_id UUID REFERENCES bookings(id),
  punch_card_id UUID REFERENCES punch_cards(id),
  metadata JSONB DEFAULT '{}',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. GUSMESTER BOOKINGS (Employee bookings)
-- ============================================
CREATE TABLE gusmester_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  point_cost INTEGER NOT NULL DEFAULT 150,
  status TEXT DEFAULT 'active',
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 14. GUEST SPOTS (Host guest management)
-- ============================================
CREATE TABLE guest_spots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  host_employee_id UUID REFERENCES employees(id),
  status TEXT DEFAULT 'reserved_for_host',
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  points_earned BOOLEAN DEFAULT false,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 15. EMPLOYEE POINTS HISTORY
-- ============================================
CREATE TABLE employee_points_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  related_session_id UUID REFERENCES sessions(id),
  related_booking_id UUID REFERENCES gusmester_bookings(id),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 16. SHOP PRODUCTS (Future use)
-- ============================================
CREATE TABLE shop_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT,
  image_url TEXT,
  in_stock BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 17. CLINIC CONFIG (Site settings)
-- ============================================
CREATE TABLE clinic_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_name TEXT NOT NULL DEFAULT 'INIPI Amagerstrand',
  currency TEXT DEFAULT 'DKK',
  stripe_account_id TEXT,
  stripe_public_key TEXT,
  company_info JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  terminology JSONB DEFAULT '{}',
  booking_window JSONB DEFAULT '{"enabled": true, "weeks": 8}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_session_id ON bookings(session_id);
CREATE INDEX idx_punch_cards_user_id ON punch_cards(user_id);
CREATE INDEX idx_employees_user_id ON employees(user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_punch_cards_updated_at BEFORE UPDATE ON punch_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ INIPI Database Schema Created Successfully!';
  RAISE NOTICE '📊 Tables created: 17';
  RAISE NOTICE '🔍 Indexes created: 6';
  RAISE NOTICE '⚡ Functions created: 2';
  RAISE NOTICE '🎯 Next step: Set up Row Level Security (RLS)';
END $$;

