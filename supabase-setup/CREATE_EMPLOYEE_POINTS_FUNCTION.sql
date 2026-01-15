-- Create function to increment employee points atomically
-- This prevents race conditions when multiple processes try to update points

CREATE OR REPLACE FUNCTION increment_employee_points(
  employee_id UUID,
  points_to_add INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE employees
  SET points = COALESCE(points, 0) + points_to_add
  WHERE id = employee_id;
END;
$$;

-- Grant execute permission to authenticated users (cron job uses service role)
GRANT EXECUTE ON FUNCTION increment_employee_points(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_employee_points(UUID, INTEGER) TO service_role;

COMMENT ON FUNCTION increment_employee_points IS 'Atomically increment employee points to prevent race conditions';
