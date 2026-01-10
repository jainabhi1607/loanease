-- Create a function to handle organisation creation
CREATE OR REPLACE FUNCTION create_organisation_with_user(
  p_company_name TEXT,
  p_trading_name TEXT,
  p_abn TEXT,
  p_address TEXT,
  p_entity_type TEXT,
  p_industry_type TEXT,
  p_phone TEXT
) RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  INSERT INTO public.organisations (
    company_name,
    trading_name,
    abn,
    address,
    entity_type,
    industry_type,
    phone
  ) VALUES (
    p_company_name,
    p_trading_name,
    p_abn,
    p_address,
    p_entity_type,
    p_industry_type,
    p_phone
  ) RETURNING id INTO v_org_id;
  
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_organisation_with_user TO authenticated;
GRANT EXECUTE ON FUNCTION create_organisation_with_user TO service_role;