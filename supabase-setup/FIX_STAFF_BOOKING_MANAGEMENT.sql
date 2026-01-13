-- This migration allows staff members to manage (update/delete) any booking
-- This is required for the admin cancellation feature in ClientDetailsModal

-- Add RLS policy to allow staff to UPDATE any booking
CREATE POLICY "Staff can update any booking"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.frontend_permissions->>'staff' = 'true'
      AND employees.status = 'active'
    )
  );

-- Add RLS policy to allow staff to DELETE any booking (if needed in future)
CREATE POLICY "Staff can delete any booking"
  ON bookings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.frontend_permissions->>'staff' = 'true'
      AND employees.status = 'active'
    )
  );

-- Note: Staff can already SELECT all bookings via existing policies
