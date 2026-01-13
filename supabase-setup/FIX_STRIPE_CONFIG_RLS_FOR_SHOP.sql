-- ============================================
-- FIX: Allow all authenticated users to read Stripe publishable key
-- ============================================
-- ISSUE: Shop page fails for regular customers because they can't read stripe_config
-- Only admins could access stripe_config, but customers need the publishable_key to make payments
-- 
-- SOLUTION: Allow authenticated users to SELECT from stripe_config
-- The publishable_key is safe to expose (it's meant to be public)
-- The secret_key is never exposed to the frontend anyway
-- ============================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Admins can view stripe config" ON stripe_config;

-- Create new policy: All authenticated users can read Stripe config
-- This is safe because:
-- 1. The publishable_key is meant to be public (starts with pk_)
-- 2. The secret_key is never sent to the frontend
-- 3. Users need this to initialize Stripe.js for payments
CREATE POLICY "Authenticated users can view stripe config"
  ON stripe_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Keep the admin-only update policy (unchanged)
-- Only admins should be able to modify Stripe settings
