-- ============================================
-- SYNC EMAIL FROM AUTH TO PROFILES
-- ============================================
-- This ensures that when a user changes their email in Supabase Auth,
-- it automatically updates in the profiles table

-- ============================================
-- 1. CREATE TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION sync_email_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the profiles table when auth.users email changes
  UPDATE profiles
  SET 
    email = NEW.email,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  -- Also update employees table if user is an employee
  UPDATE employees
  SET 
    email = NEW.email,
    updated_at = NOW()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. CREATE TRIGGER ON AUTH.USERS
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;

CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION sync_email_to_profile();

-- ============================================
-- 3. MANUALLY SYNC EXISTING MISMATCHED EMAILS
-- ============================================
-- Update profiles table with current auth emails
UPDATE profiles p
SET 
  email = au.email,
  updated_at = NOW()
FROM auth.users au
WHERE p.id = au.id
  AND p.email IS DISTINCT FROM au.email;

-- Update employees table with current auth emails
UPDATE employees e
SET 
  email = au.email,
  updated_at = NOW()
FROM auth.users au
WHERE e.user_id = au.id
  AND e.email IS DISTINCT FROM au.email;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
DECLARE
  profiles_updated INTEGER;
  employees_updated INTEGER;
BEGIN
  -- Count how many were updated
  SELECT COUNT(*) INTO profiles_updated
  FROM profiles p
  JOIN auth.users au ON p.id = au.id
  WHERE p.email = au.email;
  
  SELECT COUNT(*) INTO employees_updated
  FROM employees e
  JOIN auth.users au ON e.user_id = au.id
  WHERE e.email = au.email;
  
  RAISE NOTICE '✅ Email Sync Trigger Created Successfully!';
  RAISE NOTICE '📊 Profiles synced: %', profiles_updated;
  RAISE NOTICE '📊 Employees synced: %', employees_updated;
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Future email changes in Supabase Auth will automatically sync to profiles and employees tables.';
END $$;

