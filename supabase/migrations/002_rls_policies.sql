-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ip_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_fa_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_assessments ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's organization
CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin (Loanease)
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.user_role() IN ('super_admin', 'admin_team');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations policies
CREATE POLICY "Admins can view all organizations"
  ON organizations FOR SELECT
  USING (auth.is_admin());

CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id = auth.user_organization_id());

CREATE POLICY "Only super admins can insert organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.user_role() = 'super_admin');

CREATE POLICY "Only super admins can update organizations"
  ON organizations FOR UPDATE
  USING (auth.user_role() = 'super_admin');

-- User profiles policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (user_id = auth.uid() OR auth.is_admin());

CREATE POLICY "Users in same organization can view each other"
  ON user_profiles FOR SELECT
  USING (
    organization_id = auth.user_organization_id() 
    AND auth.user_role() IN ('referrer_admin', 'referrer_team')
  );

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
  ON user_profiles FOR ALL
  USING (auth.is_admin());

CREATE POLICY "Referrer admins can manage team profiles"
  ON user_profiles FOR ALL
  USING (
    auth.user_role() = 'referrer_admin' 
    AND organization_id = auth.user_organization_id()
    AND role = 'referrer_team'
  );

-- Clients policies
CREATE POLICY "Admins can view all clients"
  ON clients FOR SELECT
  USING (auth.is_admin());

CREATE POLICY "Users can view their organization's clients"
  ON clients FOR SELECT
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can create clients for their organization"
  ON clients FOR INSERT
  WITH CHECK (
    organization_id = auth.user_organization_id() 
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their organization's clients"
  ON clients FOR UPDATE
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Admins can manage all clients"
  ON clients FOR ALL
  USING (auth.is_admin());

-- Opportunities policies
CREATE POLICY "Admins can view all opportunities"
  ON opportunities FOR SELECT
  USING (auth.is_admin());

CREATE POLICY "Users can view their organization's opportunities"
  ON opportunities FOR SELECT
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Referrer team can only view their own opportunities"
  ON opportunities FOR SELECT
  USING (
    auth.user_role() = 'referrer_team' 
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can create opportunities for their organization"
  ON opportunities FOR INSERT
  WITH CHECK (
    organization_id = auth.user_organization_id() 
    AND created_by = auth.uid()
  );

CREATE POLICY "Only admins can update opportunity status"
  ON opportunities FOR UPDATE
  USING (auth.is_admin());

CREATE POLICY "Users can update their draft opportunities"
  ON opportunities FOR UPDATE
  USING (
    status = 'draft' 
    AND created_by = auth.uid() 
    AND organization_id = auth.user_organization_id()
  );

-- Comments policies
CREATE POLICY "Users can view public comments on their opportunities"
  ON comments FOR SELECT
  USING (
    is_public = true 
    AND EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = comments.opportunity_id 
      AND (
        opportunities.organization_id = auth.user_organization_id() 
        OR auth.is_admin()
      )
    )
  );

CREATE POLICY "Admins can view all comments"
  ON comments FOR SELECT
  USING (auth.is_admin());

CREATE POLICY "Users can create comments on their opportunities"
  ON comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = comments.opportunity_id 
      AND (
        opportunities.organization_id = auth.user_organization_id() 
        OR auth.is_admin()
      )
    )
  );

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (user_id = auth.uid());

-- Audit logs policies
CREATE POLICY "Only admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (auth.is_admin());

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- User sessions policies
CREATE POLICY "Users can view their own sessions"
  ON user_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
  ON user_sessions FOR SELECT
  USING (auth.is_admin());

CREATE POLICY "Users can manage their own sessions"
  ON user_sessions FOR ALL
  USING (user_id = auth.uid());

-- User IP history policies
CREATE POLICY "Users can view their own IP history"
  ON user_ip_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert IP history"
  ON user_ip_history FOR INSERT
  WITH CHECK (true);

-- Two FA codes policies
CREATE POLICY "Users can view their own 2FA codes"
  ON two_fa_codes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can manage 2FA codes"
  ON two_fa_codes FOR ALL
  USING (true);

-- Login attempts policies
CREATE POLICY "Admins can view login attempts"
  ON login_attempts FOR SELECT
  USING (auth.is_admin());

CREATE POLICY "System can manage login attempts"
  ON login_attempts FOR ALL
  USING (true);

-- Global settings policies
CREATE POLICY "All authenticated users can view settings"
  ON global_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only super admins can manage settings"
  ON global_settings FOR ALL
  USING (auth.user_role() = 'super_admin');

-- Pre-assessments policies
CREATE POLICY "Users can view their own pre-assessments"
  ON pre_assessments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create pre-assessments"
  ON pre_assessments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all pre-assessments"
  ON pre_assessments FOR SELECT
  USING (auth.is_admin());