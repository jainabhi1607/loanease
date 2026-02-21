-- Create Super Admin User
-- Email: cf@northbase.io
-- Password: JhbGciOiJIUzI1NiIsInR5cCI6IkpX!!

-- This script assumes you've created the user in Supabase Dashboard first
-- Go to Authentication > Users > Invite User with the email above

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the user ID for the admin email
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'cf@northbase.io'
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    -- Update or insert the user profile with super_admin role
    INSERT INTO public.user_profiles (
      user_id,
      first_name,
      last_name,
      role,
      two_fa_enabled,
      is_active
    ) VALUES (
      admin_user_id,
      'Loanease',
      'Admin',
      'super_admin',
      true,  -- 2FA is mandatory for super admins
      true
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      role = 'super_admin',
      two_fa_enabled = true,
      updated_at = NOW();
    
    RAISE NOTICE 'Super admin user configured successfully for cf@northbase.io';
  ELSE
    RAISE NOTICE 'User not found. Please create user cf@northbase.io in Supabase Dashboard first';
  END IF;
END $$;