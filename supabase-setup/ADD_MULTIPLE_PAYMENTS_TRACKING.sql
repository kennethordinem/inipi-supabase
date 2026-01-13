-- ============================================
-- ADD MULTIPLE PAYMENTS TRACKING FOR BOOKINGS
-- ============================================
-- This allows tracking multiple Stripe payments for a single booking
-- (e.g., initial booking + added seats)

-- Create a new table to track all payments for a booking
CREATE TABLE IF NOT EXISTS booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  seats_count INTEGER NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('initial', 'additional_seats')),
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_payment_intent UNIQUE (stripe_payment_intent_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_booking_payments_booking_id ON booking_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_payments_stripe_pi ON booking_payments(stripe_payment_intent_id);

-- Enable RLS
ALTER TABLE booking_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own booking payments
CREATE POLICY "Users can view their own booking payments"
  ON booking_payments
  FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    )
  );

-- Service role can do everything (for API routes)
CREATE POLICY "Service role full access to booking_payments"
  ON booking_payments
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Admins can view all
CREATE POLICY "Admins can view all booking payments"
  ON booking_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND (frontend_permissions->>'administration')::boolean = true
    )
  );

-- ============================================
-- MIGRATE EXISTING BOOKINGS
-- ============================================
-- Move existing stripe_payment_intent_id data to the new table
INSERT INTO booking_payments (booking_id, stripe_payment_intent_id, amount, seats_count, payment_type, created_at)
SELECT 
  b.id,
  b.stripe_payment_intent_id,
  COALESCE(i.amount, 0),
  b.spots,
  'initial',
  b.created_at
FROM bookings b
LEFT JOIN invoices i ON i.booking_id = b.id
WHERE b.stripe_payment_intent_id IS NOT NULL
  AND b.stripe_payment_intent_id != ''
  AND NOT EXISTS (
    SELECT 1 FROM booking_payments bp 
    WHERE bp.stripe_payment_intent_id = b.stripe_payment_intent_id
  );

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Multiple Payments Tracking Created Successfully!';
  RAISE NOTICE '📊 New table: booking_payments';
  RAISE NOTICE '🔄 Migrated existing payment intents from bookings table';
  RAISE NOTICE '🎯 Ready to track multiple payments per booking';
END $$;
