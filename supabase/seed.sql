-- Seed file for development environment
-- This creates test users and sample data

-- Create test super admin user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'admin@loanease.com',
  crypt('Admin123!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Admin", "last_name": "User", "role": "super_admin"}',
  NOW(),
  NOW()
);

-- Create test referrer organization
INSERT INTO organizations (id, company_name, abn, email, phone, address)
VALUES (
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Test Accounting Firm',
  '12345678901',
  'contact@testfirm.com.au',
  '0412345678',
  '123 Test Street, Sydney NSW 2000'
);

-- Create test referrer admin user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'referrer@testfirm.com.au',
  crypt('Referrer123!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "John", "last_name": "Referrer", "role": "referrer_admin", "organization_id": "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"}',
  NOW(),
  NOW()
);

-- Update user profiles for test users
UPDATE user_profiles 
SET organization_id = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
WHERE user_id = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Create sample client
INSERT INTO clients (id, organization_id, abn, entity_name, contact_first_name, contact_last_name, contact_email, contact_phone, created_by)
VALUES (
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '98765432109',
  'Sample Business Pty Ltd',
  'Jane',
  'Smith',
  'jane@samplebusiness.com.au',
  '0498765432',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
);

-- Create sample opportunity
INSERT INTO opportunities (organization_id, client_id, status, loan_amount, loan_purpose, created_by)
VALUES (
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'opportunity',
  500000,
  'Equipment purchase',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
);