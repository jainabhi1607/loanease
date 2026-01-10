
CREATE POLICY "Admin can view all opportunity details"
  ON opportunity_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin_team')
    )
  );


CREATE POLICY "Admin can insert opportunity details"
  ON opportunity_details FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin_team')
    )
  );


CREATE POLICY "Admin can update opportunity details"
  ON opportunity_details FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin_team')
    )
  );


CREATE POLICY "Admin can delete opportunity details"
  ON opportunity_details FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin_team')
    )
  );


