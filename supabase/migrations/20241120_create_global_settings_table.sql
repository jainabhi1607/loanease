-- Create global_settings table for storing application-wide settings
CREATE TABLE IF NOT EXISTS global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type TEXT DEFAULT 'text',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on setting_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_global_settings_key ON global_settings(setting_key);

-- Add RLS policies
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- Only super_admin and admin_team can view settings
CREATE POLICY "Admin can view settings"
  ON global_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin_team')
    )
  );

-- Only super_admin and admin_team can update settings
CREATE POLICY "Admin can update settings"
  ON global_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin_team')
    )
  );

-- Only super_admin and admin_team can insert settings
CREATE POLICY "Admin can insert settings"
  ON global_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin_team')
    )
  );

-- Insert default settings
INSERT INTO global_settings (setting_key, setting_value, setting_type, description) VALUES
  ('opportunity_alert_emails', '', 'textarea', 'Email addresses for opportunity alerts (one per line)'),
  ('new_referrer_alert_emails', '', 'textarea', 'Email addresses for new referrer alerts (one per line)'),
  ('loan_declined_reasons', '["Client does not have enough working capital","Bad Credit History","Does not meet servicing","Does not meet lender policy"]', 'json', 'List of loan declined reasons'),
  ('default_interest_rate', '8.5', 'number', 'Default interest rate for calculations'),
  ('commission_split', 'Loanease will pay 30% (inclusive of GST) of the net upfront commission received by Loanease from the lender (via the aggregator).\n\nThis will be paid typically monthly in arrears as per aggregator / lender payment terms and you will receive your own copy of the commission statement for your records, directly from the aggregator.', 'textarea', 'Commission split text'),
  ('terms_and_conditions', 'BACKGROUND\nA. Loanease is a provider of the Services.\nB. The Referrer is a provider of the Referrer Services.\nC. Subject to the terms of this Agreement:\na. Loanease shall offer the Services to Referred Clients who are Introduced by the Referrer, and\nb. where the Referrer provides Loanease with a Referral, Loanease will pay the Referrer the Referral Fees.\n\nOPERATIVE PART\n1. TERM\nbody', 'textarea', 'Terms and conditions content'),
  ('referrer_fees', '30% (inclusive of GST) of the net upfront commission and 20% (inclusive of GST) of the net trail commission received by Loanease from the Lender (as defined in the definition of Referral Fees in Schedule 1).', 'textarea', 'Referrer fees text')
ON CONFLICT (setting_key) DO NOTHING;

-- Add comment
COMMENT ON TABLE global_settings IS 'Stores global application settings and configurations';
