-- ============================================
-- FIX GUEST SPOTS WHEN GUSMESTER IS CHANGED
-- ============================================
-- This ensures that when an admin changes the gusmester on a session,
-- the guest spots are updated to reflect the new gusmester

-- ============================================
-- 1. FUNCTION TO HANDLE EMPLOYEE CHANGES
-- ============================================
CREATE OR REPLACE FUNCTION handle_session_employee_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle UPDATE (employee changed)
  IF TG_OP = 'UPDATE' AND OLD.employee_id != NEW.employee_id THEN
    -- Delete old guest spots for the old employee
    DELETE FROM guest_spots
    WHERE session_id = OLD.session_id
      AND host_employee_id = OLD.employee_id;
    
    -- Create new guest spots for the new employee
    -- Gusmester Spot (auto-released 3 hours before)
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
    ON CONFLICT (session_id, spot_type) DO UPDATE
    SET host_employee_id = NEW.employee_id,
        status = 'reserved_for_host';
    
    -- Guest Spot (manually releasable, earns points)
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
    ON CONFLICT (session_id, spot_type) DO UPDATE
    SET host_employee_id = NEW.employee_id,
        status = 'reserved_for_host',
        guest_name = NULL,
        guest_email = NULL,
        guest_phone = NULL;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE (employee removed from session)
  IF TG_OP = 'DELETE' THEN
    -- Delete guest spots for this employee and session
    DELETE FROM guest_spots
    WHERE session_id = OLD.session_id
      AND host_employee_id = OLD.employee_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. CREATE TRIGGER FOR UPDATE AND DELETE
-- ============================================
DROP TRIGGER IF EXISTS handle_employee_change_on_session ON session_employees;

CREATE TRIGGER handle_employee_change_on_session
  AFTER UPDATE OR DELETE ON session_employees
  FOR EACH ROW
  EXECUTE FUNCTION handle_session_employee_change();

-- ============================================
-- 3. CLEAN UP ORPHANED GUEST SPOTS
-- ============================================
-- Remove guest spots where the host_employee_id doesn't match
-- the current employee assigned to the session

DELETE FROM guest_spots gs
WHERE NOT EXISTS (
  SELECT 1 
  FROM session_employees se 
  WHERE se.session_id = gs.session_id 
    AND se.employee_id = gs.host_employee_id
);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  -- Count how many were cleaned up
  GET DIAGNOSTICS orphaned_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Guest Spots Employee Change Handler Created Successfully!';
  RAISE NOTICE '📊 Orphaned guest spots cleaned up: %', orphaned_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Guest spots will now automatically update when:';
  RAISE NOTICE '   - Admin changes the gusmester on a session (UPDATE)';
  RAISE NOTICE '   - Admin removes a gusmester from a session (DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE '✨ "Mine hosting sessioner" will now correctly reflect the current gusmester assignments!';
END $$;

