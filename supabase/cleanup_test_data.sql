-- Run this in your Supabase SQL Editor to clean up test data

-- First, get the user ID for the test user
DO $$
DECLARE
  test_user_id UUID;
  test_org_id UUID;
BEGIN
  -- Get the user ID based on email
  SELECT id INTO test_user_id FROM auth.users WHERE email = 'sxda@northbase.io';
  
  -- Get the organisation ID
  SELECT id INTO test_org_id FROM public.organisations WHERE abn = '62649069778';
  
  -- Delete audit logs for this user
  DELETE FROM public.audit_logs WHERE user_id = test_user_id;
  
  -- Delete from organisation_directors
  DELETE FROM public.organisation_directors WHERE organisation_id = test_org_id;
  
  -- Delete from users table
  DELETE FROM public.users WHERE id = test_user_id;
  
  -- Delete from organisations
  DELETE FROM public.organisations WHERE id = test_org_id;
  
  -- Finally, delete from auth.users (this should cascade but let's be explicit)
  DELETE FROM auth.users WHERE id = test_user_id;
  
  RAISE NOTICE 'Cleanup completed successfully';
END $$;

-- Alternative: If you want to run it step by step, use these individual commands:
-- Replace the email and ABN with your test values

-- Step 1: Delete audit logs
DELETE FROM public.audit_logs 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'sxda@northbase.io'
);

-- Step 2: Delete organisation directors
DELETE FROM public.organisation_directors 
WHERE organisation_id IN (
  SELECT id FROM public.organisations WHERE abn = '62649069778'
);

-- Step 3: Delete from users table
DELETE FROM public.users 
WHERE email = 'sxda@northbase.io';

-- Step 4: Delete from organisations
DELETE FROM public.organisations 
WHERE abn = '62649069778';

-- Step 5: Delete from auth.users
DELETE FROM auth.users 
WHERE email = 'sxda@northbase.io';