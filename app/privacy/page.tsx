import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Loanease',
  description: 'How Loanease collects, uses, and protects your personal information.',
};

const LAST_UPDATED = '18 May 2026';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-[#02383B] hover:underline">
            ← Loanease
          </Link>
          <span className="text-xs text-gray-500">Privacy Policy</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold text-[#02383B] mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-gray-800 leading-relaxed">
          <section>
            <p>
              This Privacy Policy explains how Loanease (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
              &ldquo;our&rdquo;) collects, uses, stores, and protects your personal information
              when you use the Loanease web platform and mobile application
              (the &ldquo;Service&rdquo;). By using the Service you consent to the practices
              described below.
            </p>
          </section>

          <Section title="1. Who we are">
            <p>
              Loanease is a commercial loan referral platform that connects referrers (such as
              brokers, accountants, and financial planners) with our commercial finance team. We
              operate in India and process personal data in accordance with applicable Indian data
              protection law.
            </p>
            <p className="mt-3">
              <strong>Operator:</strong> LOANEASE PTY LTD<br />
              <strong>Contact:</strong>{' '}
              <a href="mailto:support@loanease.com" className="text-[#1a8cba] underline">
                support@loanease.com
              </a>
            </p>
          </Section>

          <Section title="2. Information we collect">
            <p>We collect the following categories of information:</p>

            <h3 className="font-semibold mt-4 mb-2">Account &amp; identity information</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Name (first name, surname)</li>
              <li>Email address</li>
              <li>Phone number (Indian +91 format)</li>
              <li>State of residence</li>
              <li>Role (referrer admin, team member)</li>
              <li>Password (stored as a bcrypt hash; never in plain text)</li>
              <li>Two-factor authentication codes (time-limited, then deleted)</li>
            </ul>

            <h3 className="font-semibold mt-4 mb-2">Business information (referrer organisations)</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Company name, trading name, and ABN/registration details</li>
              <li>Company address and contact details</li>
              <li>Director names</li>
              <li>Industry type and commission split arrangements</li>
              <li>Signed referrer agreement (with IP address and timestamp)</li>
            </ul>

            <h3 className="font-semibold mt-4 mb-2">Loan opportunity &amp; client data</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Client business name, entity type, contact details, and ABN</li>
              <li>Loan amount, property value, loan type, asset details, and purpose</li>
              <li>Financial information you submit (net profit, depreciation, interest costs,
                rental income, liabilities)</li>
              <li>Risk indicators (ATO issues, credit issues, additional security)</li>
              <li>Notes and comments you add to an opportunity</li>
            </ul>

            <h3 className="font-semibold mt-4 mb-2">Device &amp; usage information</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Authentication tokens stored on your device (secure storage)</li>
              <li>App version and platform (iOS / Android / web)</li>
              <li>IP address and approximate location (for login security)</li>
              <li>Login history (successful logins, failed attempts, blocked attempts)</li>
              <li>Audit logs of changes you make in the platform</li>
            </ul>

            <h3 className="font-semibold mt-4 mb-2">Biometric information</h3>
            <p>
              If you enable Face ID, Touch ID, or fingerprint login, the biometric template is
              stored and processed <strong>only on your device</strong> by the operating system.
              Loanease never receives, stores, or has access to your biometric data.
            </p>
          </Section>

          <Section title="3. How we use your information">
            <ul className="list-disc pl-6 space-y-1">
              <li>To create and operate your Loanease account</li>
              <li>To allow you to submit, manage, and track loan opportunities and applications</li>
              <li>To communicate with you about your account, opportunities, and our services
                (via email and the in-app interface)</li>
              <li>To verify your identity and protect your account (2FA, login history, IP checks)</li>
              <li>To calculate referrer commissions in accordance with your agreement</li>
              <li>To meet legal, regulatory, and compliance obligations</li>
              <li>To detect, investigate, and prevent fraudulent or unauthorised activity</li>
              <li>To improve the Service (in aggregate; we do not sell your personal data)</li>
            </ul>
          </Section>

          <Section title="4. How we share information">
            <p>We share personal information only as needed to operate the Service:</p>
            <ul className="list-disc pl-6 space-y-1 mt-3">
              <li><strong>Loanease staff</strong> who process the opportunities you submit</li>
              <li><strong>Other members of your referrer organisation</strong> can see opportunities
                submitted under that organisation</li>
              <li><strong>Service providers</strong> who help us run the Service (cloud hosting on
                Vercel, database hosting on MongoDB Atlas, transactional email through Postmark).
                These providers process data only on our instructions.</li>
              <li><strong>Lenders and aggregators</strong> when you submit an opportunity for
                assessment</li>
              <li><strong>Regulators, law enforcement, or courts</strong> where required by law</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal data, and we do not share it with third parties for
              their own marketing purposes.
            </p>
          </Section>

          <Section title="5. Data security">
            <ul className="list-disc pl-6 space-y-1">
              <li>All traffic between your device and our servers is encrypted in transit (HTTPS/TLS).</li>
              <li>Passwords are hashed with bcrypt (12 rounds); we never store plain-text passwords.</li>
              <li>Authentication tokens on mobile devices are stored in the OS secure keystore
                (Android Keystore / iOS Keychain).</li>
              <li>Access to the database is restricted to authorised personnel and audited.</li>
              <li>Refresh tokens are rotated on each refresh and invalidated on logout.</li>
              <li>Sensitive actions are logged in our audit log.</li>
            </ul>
          </Section>

          <Section title="6. How long we keep your data">
            <p>
              We retain personal data only for as long as needed for the purposes set out above
              and to meet our legal and regulatory obligations.
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-3">
              <li>Active account data is kept while your account is open.</li>
              <li>After account deletion (see below), personal identifiers are removed and your
                user record is anonymised. Loan opportunities, audit logs, and regulatory records
                you created may be retained for up to 7 years to meet financial-services
                record-keeping requirements.</li>
              <li>Login history is retained for security purposes and may be deleted after 12
                months.</li>
            </ul>
          </Section>

          <Section title="7. Your rights">
            <p>You can:</p>
            <ul className="list-disc pl-6 space-y-1 mt-3">
              <li><strong>Access</strong> the personal information held about you</li>
              <li><strong>Correct</strong> inaccurate information (via the Edit Profile screen)</li>
              <li><strong>Delete</strong> your account at any time (Account &rarr; Delete Account
                inside the app, or by emailing us)</li>
              <li><strong>Withdraw consent</strong> for optional processing</li>
              <li><strong>Complain</strong> to the relevant data protection authority</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{' '}
              <a href="mailto:support@loanease.com" className="text-[#1a8cba] underline">
                support@loanease.com
              </a>. We will respond within 30 days.
            </p>
          </Section>

          <Section title="8. Account deletion">
            <p>
              You can delete your Loanease account at any time from inside the mobile app
              (Account &rarr; Delete Account) or by emailing{' '}
              <a href="mailto:support@loanease.com" className="text-[#1a8cba] underline">
                support@loanease.com
              </a>{' '}
              from the email address registered on your account.
            </p>
            <p className="mt-3">When you delete your account:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Your login credentials, password, sessions, and 2FA codes are deleted immediately.</li>
              <li>Your name, email, phone number, and other personal identifiers are removed from
                your user record.</li>
              <li>Loan opportunities and client records you created are retained in anonymised form
                for regulatory compliance.</li>
              <li>If you are the only administrator on your referrer organisation, the organisation
                account will also be deactivated.</li>
            </ul>
          </Section>

          <Section title="9. Children">
            <p>
              The Service is intended for finance professionals and is not directed at people under
              18. We do not knowingly collect personal data from children.
            </p>
          </Section>

          <Section title="10. Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. Material changes will be
              communicated by email or in-app notice. The &ldquo;Last updated&rdquo; date at the
              top reflects the most recent version.
            </p>
          </Section>

          <Section title="11. Contact us">
            <p>
              If you have any questions about this Privacy Policy or our handling of your personal
              data, please contact:
            </p>
            <p className="mt-3">
              LOANEASE PTY LTD<br />
              Email:{' '}
              <a href="mailto:support@loanease.com" className="text-[#1a8cba] underline">
                support@loanease.com
              </a>
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-500">
          <Link href="/terms" className="underline">Terms &amp; Conditions</Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-[#02383B] mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
