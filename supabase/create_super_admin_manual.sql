-- Manual approach to create super admin
-- First run the fix_user_trigger.sql to fix the trigger issue

-- Step 1: Create the user in Supabase Dashboard (Authentication > Users > Invite User)
-- Email: cf@northbase.io
-- Password: Set your password

-- Step 2: After user is created, get their ID and run this:
-- You can find the user ID in the Authentication > Users table

-- Replace 'YOUR_USER_ID_HERE' with the actual UUID from the auth.users table
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the user ID for cf@northbase.io
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'cf@northbase.io'
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    -- Delete any existing profile (in case trigger partially created one)
    DELETE FROM public.user_profiles WHERE user_id = admin_user_id;
    
    -- Create new profile with super_admin role
    INSERT INTO public.user_profiles (
      user_id,
      first_name,
      last_name,
      role,
      two_fa_enabled,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      admin_user_id,
      'Clue Finance',
      'Admin',
      'super_admin'::user_role,
      true,
      true,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Super admin profile created successfully for cf@northbase.io';
  ELSE
    RAISE NOTICE 'User cf@northbase.io not found. Please create the user first.';
  END IF;
END $$;

-- Verify the user was created correctly
SELECT 
  u.email,
  u.created_at as user_created,
  p.role,
  p.first_name,
  p.last_name,
  p.two_fa_enabled
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.user_id
WHERE u.email = 'cf@northbase.io';