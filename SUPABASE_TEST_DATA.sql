-- ============================================
-- INIPI TEST DATA
-- Run this in Supabase SQL Editor to add test sessions
-- ============================================

-- Insert some test sessions for the next 2 weeks
DO $$
DECLARE
  fyraftensgus_id UUID;
  privat_id UUID;
  morgengus_id UUID;
  test_employee_id UUID;
BEGIN
  -- Get group type IDs
  SELECT id INTO fyraftensgus_id FROM group_types WHERE name = 'Fyraftensgus';
  SELECT id INTO privat_id FROM group_types WHERE name = 'Privat/Firma Gus';
  SELECT id INTO morgengus_id FROM group_types WHERE name = 'Morgengus';

  -- Create a test employee (you can update this with real data later)
  INSERT INTO employees (name, email, title, points, status)
  VALUES ('Test Gusmester', 'gusmester@inipi.dk', 'Certificeret Gusmester', 300, 'active')
  RETURNING id INTO test_employee_id;

  -- Insert test sessions for next 2 weeks
  -- Fyraftensgus sessions (Monday-Friday at 17:00)
  INSERT INTO sessions (name, description, date, time, duration, max_participants, price, location, group_type_id, status)
  VALUES
    ('Fyraftensgus', 'Afslappende fyraftensgus med guidet session', CURRENT_DATE + INTERVAL '1 day', '17:00', 90, 12, 150.00, 'Havkajakvej, Amagerstrand', fyraftensgus_id, 'active'),
    ('Fyraftensgus', 'Afslappende fyraftensgus med guidet session', CURRENT_DATE + INTERVAL '2 days', '17:00', 90, 12, 150.00, 'Havkajakvej, Amagerstrand', fyraftensgus_id, 'active'),
    ('Fyraftensgus', 'Afslappende fyraftensgus med guidet session', CURRENT_DATE + INTERVAL '3 days', '17:00', 90, 12, 150.00, 'Havkajakvej, Amagerstrand', fyraftensgus_id, 'active'),
    ('Fyraftensgus', 'Afslappende fyraftensgus med guidet session', CURRENT_DATE + INTERVAL '4 days', '17:00', 90, 12, 150.00, 'Havkajakvej, Amagerstrand', fyraftensgus_id, 'active'),
    ('Fyraftensgus', 'Afslappende fyraftensgus med guidet session', CURRENT_DATE + INTERVAL '5 days', '17:00', 90, 12, 150.00, 'Havkajakvej, Amagerstrand', fyraftensgus_id, 'active'),
    
    -- Weekend sessions
    ('Weekend Gus', 'Weekend sauna oplevelse', CURRENT_DATE + INTERVAL '6 days', '10:00', 120, 15, 200.00, 'Havkajakvej, Amagerstrand', fyraftensgus_id, 'active'),
    ('Weekend Gus', 'Weekend sauna oplevelse', CURRENT_DATE + INTERVAL '7 days', '10:00', 120, 15, 200.00, 'Havkajakvej, Amagerstrand', fyraftensgus_id, 'active'),
    
    -- Morgengus sessions
    ('Morgengus', 'Start dagen med energi i saunaen', CURRENT_DATE + INTERVAL '1 day', '07:00', 60, 10, 120.00, 'Havkajakvej, Amagerstrand', morgengus_id, 'active'),
    ('Morgengus', 'Start dagen med energi i saunaen', CURRENT_DATE + INTERVAL '3 days', '07:00', 60, 10, 120.00, 'Havkajakvej, Amagerstrand', morgengus_id, 'active'),
    ('Morgengus', 'Start dagen med energi i saunaen', CURRENT_DATE + INTERVAL '5 days', '07:00', 60, 10, 120.00, 'Havkajakvej, Amagerstrand', morgengus_id, 'active'),
    
    -- Private events
    ('Privat Firma Event', 'Eksklusiv saunagus for din gruppe', CURRENT_DATE + INTERVAL '8 days', '18:00', 150, 20, 2500.00, 'Havkajakvej, Amagerstrand', privat_id, 'active'),
    ('Privat Firma Event', 'Eksklusiv saunagus for din gruppe', CURRENT_DATE + INTERVAL '12 days', '18:00', 150, 20, 2500.00, 'Havkajakvej, Amagerstrand', privat_id, 'active');

  -- Link the test employee to all sessions
  INSERT INTO session_employees (session_id, employee_id)
  SELECT id, test_employee_id
  FROM sessions
  WHERE date >= CURRENT_DATE;

  RAISE NOTICE '✅ Test data inserted successfully!';
  RAISE NOTICE '📅 Sessions created: 12';
  RAISE NOTICE '👤 Test employee created: Test Gusmester';
  RAISE NOTICE '🎯 You can now test the booking flow!';
END $$;

