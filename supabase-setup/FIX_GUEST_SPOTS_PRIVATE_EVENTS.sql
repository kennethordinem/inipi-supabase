-- ============================================
-- FIX: PREVENT GUEST SPOTS ON PRIVATE EVENTS
-- Guest spots should ONLY be created for Fyraftensgus (is_private = false)
-- Private events should NOT have guest spots
-- ============================================

-- Step 1: Update the trigger function to check is_private
-- This prevents future private events from getting guest spots
CREATE OR REPLACE FUNCTION create_guest_spots_for_session()
RETURNS TRIGGER AS $$
DECLARE
  session_is_private BOOLEAN;
BEGIN
  -- Check if this session is a private event
  SELECT gt.is_private INTO session_is_private
  FROM sessions s
  JOIN group_types gt ON s.group_type_id = gt.id
  WHERE s.id = NEW.session_id;
  
  -- Only create guest spots for non-private events (Fyraftensgus)
  IF session_is_private = false OR session_is_private IS NULL THEN
    -- Create Gusmester Spot (auto-released 3 hours before)
    INSERT INTO guest_spots (
      session_id,
      host_employee_id,
      spot_type,
      status
    ) VALUES (
      NEW.session_id,
      NEW.employee_id,
      'gusmester_spot',
      'reserved_for_host'
    )
    ON CONFLICT (session_id, spot_type) DO NOTHING;
    
    -- Create Guest Spot (manually releasable, earns points)
    INSERT INTO guest_spots (
      session_id,
      host_employee_id,
      spot_type,
      status
    ) VALUES (
      NEW.session_id,
      NEW.employee_id,
      'guest_spot',
      'reserved_for_host'
    )
    ON CONFLICT (session_id, spot_type) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Delete existing guest spots from private events
-- This cleans up any guest spots that were incorrectly created
DELETE FROM guest_spots
WHERE session_id IN (
  SELECT s.id
  FROM sessions s
  JOIN group_types gt ON s.group_type_id = gt.id
  WHERE gt.is_private = true
);

-- Step 3: Show what was cleaned up
DO $$
DECLARE
  deleted_count INTEGER;
  private_sessions_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  SELECT COUNT(*) INTO private_sessions_count
  FROM sessions s
  JOIN group_types gt ON s.group_type_id = gt.id
  WHERE gt.is_private = true;
  
  RAISE NOTICE '✅ Guest Spots Fixed for Private Events!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Results:';
  RAISE NOTICE '   - Deleted % guest spot(s) from private events', deleted_count;
  RAISE NOTICE '   - Total private events: %', private_sessions_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Changes:';
  RAISE NOTICE '   - Trigger now checks is_private before creating guest spots';
  RAISE NOTICE '   - Guest spots ONLY created for Fyraftensgus (is_private = false)';
  RAISE NOTICE '   - Private events will NOT get guest spots';
  RAISE NOTICE '';
  RAISE NOTICE '✨ Private events are now fully bookable by regular users!';
END $$;
