import { ServerClient } from 'postmark';
import { getCompanyPhone, getCompanyAddress, getCompanyEmail } from '@/lib/mongodb/repositories/global-settings';

// Lazy initialization of Postmark client to avoid build-time errors
let _client: ServerClient | null = null;

function getPostmarkClient(): ServerClient {
  if (!_client) {
    const apiKey = process.env.POSTMARK_API_KEY;
    if (!apiKey) {
      throw new Error('POSTMARK_API_KEY environment variable is not set');
    }
    _client = new ServerClient(apiKey);
  }
  return _client;
}

// Indian timezone constant for consistent formatting
const INDIAN_TIMEZONE = 'Asia/Kolkata';

// Helper function to format date/time in Indian timezone
export const formatIndianDateTime = (date: Date = new Date()) => {
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: INDIAN_TIMEZONE
  });
};

export const formatIndianDate = (date: Date = new Date()) => {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: INDIAN_TIMEZONE
  });
};

export interface EmailTemplate {
  to: string;
  templateAlias: string;
  templateModel: Record<string, unknown>;
  from?: string;
}

export async function sendEmail({ to, templateAlias, templateModel, from }: EmailTemplate) {
  // EMAIL DISABLED: All email sending is disabled until a new email service provider is configured.
  console.log(`[EMAIL DISABLED] Would send template "${templateAlias}" to ${to}`);
  return { success: true, messageId: 'disabled' };
}

// Helper to convert HTML to plain text for email
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Loanease brand colors
const LOANCASE_GREEN = '#00D37F';
const LOANCASE_DARK = '#02383B';

// Standard branded email template wrapper
export async function wrapInBrandedTemplate(content: string, title?: string): Promise<string> {
  // Note: Using JPG because most email clients don't support SVG
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/logo.jpg`;
  const [companyPhone, companyAddress, companyEmail] = await Promise.all([
    getCompanyPhone(),
    getCompanyAddress(),
    getCompanyEmail(),
  ]);
  const phoneDigits = companyPhone.replace(/[^\d+]/g, '');
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Loanease'}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background-color: ${LOANCASE_DARK}; padding: 30px 40px; border-radius: 12px 12px 0 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <img src="${logoUrl}" alt="Loanease" width="150" style="display: block; max-width: 150px; height: auto;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${LOANCASE_DARK}; padding: 30px 40px; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="color: #ffffff; font-size: 14px; line-height: 1.6;">
                    <p style="margin: 0 0 15px 0; font-weight: 600;">The Loanease Team</p>
                    <p style="margin: 0 0 5px 0;">
                      <a href="tel:${phoneDigits}" style="color: ${LOANCASE_GREEN}; text-decoration: none;">${companyPhone}</a>
                    </p>
                    <p style="margin: 0 0 5px 0;">
                      Applications: <a href="mailto:apps@loanease.com" style="color: ${LOANCASE_GREEN}; text-decoration: none;">apps@loanease.com</a>
                    </p>
                    <p style="margin: 0 0 20px 0;">
                      Partners: <a href="mailto:${companyEmail}" style="color: ${LOANCASE_GREEN}; text-decoration: none;">${companyEmail}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
                    <p style="margin: 0; color: rgba(255,255,255,0.6); font-size: 12px;">
                      &copy; ${new Date().getFullYear()} Loanease. All rights reserved.<br>
                      ${companyAddress}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Section header for email content
export function emailSectionHeader(title: string): string {
  return `<h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: ${LOANCASE_DARK}; border-bottom: 2px solid ${LOANCASE_GREEN}; padding-bottom: 10px;">${title}</h2>`;
}

// Primary button style
export function emailButton(text: string, url: string): string {
  return `<a href="${url}" style="display: inline-block; background-color: ${LOANCASE_GREEN}; color: ${LOANCASE_DARK}; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">${text}</a>`;
}

// Info table style
export function emailInfoTable(rows: Array<{ label: string; value: string }>): string {
  const rowsHtml = rows.map(row => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #6b7280; width: 40%;">${row.label}</td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: ${LOANCASE_DARK};">${row.value}</td>
    </tr>
  `).join('');

  return `<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">${rowsHtml}</table>`;
}

export async function sendHtmlEmail({ to, subject, htmlBody, from }: { to: string; subject: string; htmlBody: string; from?: string }) {
  // EMAIL DISABLED: All email sending is disabled until a new email service provider is configured.
  console.log(`[EMAIL DISABLED] Would send "${subject}" to ${to}`);
  return { success: true, messageId: 'disabled' };
}

export async function sendHtmlEmailWithAttachment({
  to,
  subject,
  htmlBody,
  attachment
}: {
  to: string;
  subject: string;
  htmlBody: string;
  attachment?: {
    Name: string;
    Content: string; // Base64 encoded
    ContentType: string;
  };
}) {
  // EMAIL DISABLED: All email sending is disabled until a new email service provider is configured.
  console.log(`[EMAIL DISABLED] Would send "${subject}" to ${to}${attachment ? ' (with attachment)' : ''}`);
  return { success: true, messageId: 'disabled' };
}

// Specific email functions
export async function send2FACode(email: string, code: string, firstName?: string) {
  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${firstName || 'User'},</p>

    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Your verification code for <strong>Loanease</strong> is:</p>

    <div style="text-align: center; margin: 25px 0;">
      <span style="display: inline-block; background-color: #f3f4f6; color: ${LOANCASE_DARK}; padding: 20px 40px; border-radius: 8px; font-size: 32px; font-weight: 700; letter-spacing: 8px; font-family: monospace;">${code}</span>
    </div>

    <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">This code will expire in <strong>10 minutes</strong>.</p>

    <p style="font-size: 15px; color: #374151; margin: 0;">If you didn&apos;t request this code, please ignore this email.</p>
  `;

  return sendHtmlEmail({
    to: email,
    subject: 'Your Verification Code - Loanease',
    htmlBody: await wrapInBrandedTemplate(content, 'Verification Code'),
  });
}

export async function sendWelcomeEmail(email: string, firstName: string, organizationName?: string) {
  const statusBadge = `<span style="display: inline-block; background-color: #d1fae5; color: #065f46; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">Welcome</span>`;

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${firstName},</p>

    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Welcome to <strong>Loanease</strong>${organizationName ? ` as part of <strong>${organizationName}</strong>` : ''}!</p>

    <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>

    <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">Your account has been created and you can now log in to access the platform.</p>

    <div style="text-align: center; margin: 25px 0;">
      ${emailButton('Login to Loanease', `${process.env.NEXT_PUBLIC_APP_URL}/login`)}
    </div>

    <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for joining Loanease.</p>
  `;

  return sendHtmlEmail({
    to: email,
    subject: 'Welcome to Loanease',
    htmlBody: await wrapInBrandedTemplate(content, 'Welcome'),
    from: 'partners@loanease.com',
  });
}

export async function sendPasswordReset(email: string, resetToken: string, firstName?: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/confirm?token=${resetToken}`;

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${firstName || 'User'},</p>

    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">We received a request to reset your password for your <strong>Loanease</strong> account.</p>

    <div style="text-align: center; margin: 25px 0;">
      ${emailButton('Reset Password', resetUrl)}
    </div>

    <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">This link will expire in <strong>1 hour</strong> for your security.</p>

    <p style="font-size: 15px; color: #374151; margin: 0;">If you didn&apos;t request this, you can safely ignore this email.</p>
  `;

  return sendHtmlEmail({
    to: email,
    subject: 'Reset Your Password - Loanease',
    htmlBody: await wrapInBrandedTemplate(content, 'Password Reset'),
  });
}

export async function sendPasswordResetEmail(params: { to: string; userName: string; resetLink: string }) {
  const resetUrl = params.resetLink;

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${params.userName},</p>

    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">We received a request to reset your password for your <strong>Loanease</strong> account.</p>

    <div style="text-align: center; margin: 25px 0;">
      ${emailButton('Reset Password', resetUrl)}
    </div>

    <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">This link will expire in <strong>1 hour</strong> for your security.</p>

    <p style="font-size: 15px; color: #374151; margin: 0;">If you didn&apos;t request this, you can safely ignore this email.</p>
  `;

  return sendHtmlEmail({
    to: params.to,
    subject: 'Reset Your Password - Loanease',
    htmlBody: await wrapInBrandedTemplate(content, 'Password Reset'),
  });
}

export async function sendNewIPAlert(email: string, ipAddress: string, location?: string, firstName?: string) {
  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${firstName || 'there'},</p>

    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">We detected a new login to your <strong>Loanease</strong> account.</p>

    <div style="text-align: center; margin: 25px 0;">
      <div style="display: inline-block; background-color: #f3f4f6; padding: 20px 30px; border-radius: 8px; text-align: left;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">IP Address: <strong style="color: ${LOANCASE_DARK};">${ipAddress}</strong></p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Location: <strong style="color: ${LOANCASE_DARK};">${location || 'Unknown'}</strong></p>
        <p style="margin: 0; font-size: 14px; color: #6b7280;">Time: <strong style="color: ${LOANCASE_DARK};">${formatIndianDateTime()}</strong></p>
      </div>
    </div>

    <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">If this was you, no action is needed.</p>

    <p style="font-size: 15px; color: #374151; margin: 0;">If you don&apos;t recognise this activity, please secure your account immediately.</p>
  `;

  return sendHtmlEmail({
    to: email,
    subject: 'New Login Detected - Loanease',
    htmlBody: await wrapInBrandedTemplate(content, 'Security Alert'),
  });
}

export async function sendStatusChange(
  email: string,
  opportunityId: string,
  oldStatus: string,
  newStatus: string,
  clientName: string
) {
  // Map status to human-readable format
  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    opportunity: 'Opportunity',
    application_created: 'Application Created',
    application_submitted: 'Application Submitted',
    conditionally_approved: 'Conditionally Approved',
    approved: 'Approved',
    declined: 'Declined',
    settled: 'Settled',
    withdrawn: 'Withdrawn',
  };

  return sendEmail({
    to: email,
    templateAlias: `status-change-${newStatus}`,
    templateModel: {
      opportunity_id: opportunityId,
      client_name: clientName,
      old_status: statusLabels[oldStatus] || oldStatus,
      new_status: statusLabels[newStatus] || newStatus,
      dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/opportunities/${opportunityId}`,
    },
  });
}

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  verificationToken: string,
  organizationName?: string
) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`;

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${firstName},</p>

    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Please verify your email address to complete your <strong>Loanease</strong> registration${organizationName ? ` for <strong>${organizationName}</strong>` : ''}.</p>

    <div style="text-align: center; margin: 25px 0;">
      ${emailButton('Verify Email', verificationUrl)}
    </div>

    <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">This link will expire in <strong>24 hours</strong>.</p>

    <p style="font-size: 15px; color: #374151; margin: 0;">If you didn&apos;t create an account, you can safely ignore this email.</p>
  `;

  return sendHtmlEmail({
    to: email,
    subject: 'Verify Your Email - Loanease',
    htmlBody: await wrapInBrandedTemplate(content, 'Email Verification'),
    from: 'partners@loanease.com',
  });
}

export async function sendUserInvitation(
  email: string,
  inviteUrl: string,
  organisationName: string,
  inviterName: string,
  expiresAt: Date
) {
  const statusBadge = `<span style="display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">Invitation</span>`;

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi there,</p>

    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;"><strong>${inviterName}</strong> has invited you to join <strong>${organisationName}</strong> on Loanease.</p>

    <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>

    <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">Click the button below to accept the invitation and set up your account.</p>

    <div style="text-align: center; margin: 25px 0;">
      ${emailButton('Accept Invitation', inviteUrl)}
    </div>

    <p style="font-size: 15px; color: #374151; margin: 0;">This invitation expires on <strong>${formatIndianDate(expiresAt)}</strong>.</p>
  `;

  return sendHtmlEmail({
    to: email,
    subject: `You've been invited to join ${organisationName} - Loanease`,
    htmlBody: await wrapInBrandedTemplate(content, 'Invitation'),
    from: 'partners@loanease.com',
  });
}

export async function sendNewReferrerAlert(
  recipientEmail: string,
  details: {
    directorName: string;
    companyName: string;
    contactEmail: string;
    contactPhone: string;
    abn: string;
    tradingName?: string;
    address: string;
    industryType: string;
  }
) {
  const statusBadge = `<span style="display: inline-block; background-color: #d1fae5; color: #065f46; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">New Registration</span>`;

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi Team,</p>

    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">A new referrer <strong>${details.companyName}</strong> has signed up to Loanease.</p>

    <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>

    ${emailInfoTable([
      { label: 'Registration Date', value: formatIndianDateTime() },
      { label: 'Company Name', value: details.companyName },
      { label: 'Director Name', value: details.directorName },
      { label: 'Contact Phone', value: details.contactPhone },
      { label: 'Contact Email', value: details.contactEmail },
      { label: 'ABN', value: details.abn },
      { label: 'Trading Name', value: details.tradingName || '-' },
      { label: 'Address', value: details.address },
      { label: 'Industry Type', value: details.industryType },
    ])}

    <div style="text-align: center; margin-top: 25px;">
      ${emailButton('View All Referrers', `${process.env.NEXT_PUBLIC_APP_URL}/admin/referrers`)}
    </div>
  `;

  return sendHtmlEmail({
    to: recipientEmail,
    subject: 'New Referrer Registration - Loanease',
    htmlBody: await wrapInBrandedTemplate(content, 'New Referrer'),
  });
}

// Status change email function - sends to both client and referrer
export async function sendStatusChangeEmails({
  clientEmail,
  clientName,
  referrerEmail,
  referrerName,
  applicationId,
  entityName,
  newStatus,
  reasonDeclined,
}: {
  clientEmail: string;
  clientName: string;
  referrerEmail: string;
  referrerName: string;
  applicationId: string;
  entityName: string;
  newStatus: string;
  reasonDeclined?: string;
}) {
  const today = formatIndianDate();
  const refDetails = `${applicationId} - ${entityName}`;

  // Status badge colors
  const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
    'application_created': { bg: '#dbeafe', text: '#1e40af', label: 'Application Created' },
    'application_submitted': { bg: '#e0e7ff', text: '#3730a3', label: 'Application Submitted' },
    'conditionally_approved': { bg: '#fef3c7', text: '#92400e', label: 'Conditionally Approved' },
    'approved': { bg: '#d1fae5', text: '#065f46', label: 'Approved' },
    'settled': { bg: '#00D37F', text: '#ffffff', label: 'Settled' },
    'declined': { bg: '#fee2e2', text: '#991b1b', label: 'Declined' },
    'withdrawn': { bg: '#fed7aa', text: '#9a3412', label: 'Withdrawn' },
  };

  const statusStyle = statusStyles[newStatus] || { bg: '#e5e7eb', text: '#374151', label: newStatus };

  let subject = '';
  let clientMessage = '';
  let referrerMessage = '';

  const statusBadge = `<span style="display: inline-block; background-color: ${statusStyle.bg}; color: ${statusStyle.text}; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">${statusStyle.label}</span>`;

  switch (newStatus) {
    case 'application_created':
      subject = `${applicationId} - Application Created`;
      clientMessage = `
        <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${clientName},</p>
        <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">We&apos;re pleased to inform you that an application has been created for <strong>${entityName}</strong>.</p>
        <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>
        <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">A Loanease representative will be in touch soon with further details.</p>
        <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for your ongoing support.</p>`;
      referrerMessage = `
        <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${referrerName},</p>
        <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">We&apos;re pleased to inform you that an application has been created for your opportunity <strong>${refDetails}</strong>.</p>
        <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>
        <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">A Loanease representative will be in touch soon with further details.</p>
        <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for your ongoing support.</p>`;
      break;

    case 'application_submitted':
      subject = `${applicationId} - Application Submitted`;
      clientMessage = `
        <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${clientName},</p>
        <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Fantastic news! Your application <strong>${refDetails}</strong> has been submitted on ${today}.</p>
        <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>
        <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">A Loanease representative will reach out soon to discuss the next steps.</p>
        <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for trusting Loanease.</p>`;
      referrerMessage = `
        <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${referrerName},</p>
        <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Fantastic news! The application for your referral <strong>${refDetails}</strong> has been submitted on ${today}.</p>
        <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>
        <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">A Loanease representative will reach out soon to discuss the next steps.</p>
        <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for trusting Loanease with your referrals.</p>`;
      break;

    case 'approved':
      subject = `${applicationId} - Application Approved`;
      clientMessage = `
        <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${clientName},</p>
        <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Fantastic news! Your application <strong>${refDetails}</strong> has been fully approved on ${today}.</p>
        <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>
        <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">A Loanease representative will reach out soon to discuss the next steps.</p>
        <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for trusting Loanease.</p>`;
      referrerMessage = `
        <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${referrerName},</p>
        <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Fantastic news! The application for your referral <strong>${refDetails}</strong> has been fully approved on ${today}.</p>
        <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>
        <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">A Loanease representative will reach out soon to discuss the next steps.</p>
        <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for trusting Loanease with your referrals.</p>`;
      break;

    case 'settled':
      subject = `${applicationId} - Application Settled`;
      clientMessage = `
        <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${clientName},</p>
        <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">We&apos;re excited to let you know that your application <strong>${refDetails}</strong> has been successfully settled on ${today}.</p>
        <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>
        <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">A Loanease representative will follow up shortly to discuss this great outcome.</p>
        <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for your partnership and trust. We look forward to working with you on the next one!</p>`;
      referrerMessage = `
        <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${referrerName},</p>
        <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">We&apos;re excited to let you know that the application for your referral <strong>${refDetails}</strong> has been successfully settled on ${today}.</p>
        <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>
        <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">A Loanease representative will follow up shortly to discuss this great outcome.</p>
        <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for your partnership and trust. We look forward to working with you on the next one!</p>`;
      break;

    case 'conditionally_approved':
      subject = `${applicationId} - Application Conditionally Approved`;
      clientMessage = `
        <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${clientName},</p>
        <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">We&apos;re thrilled to inform you that your application <strong>${applicationId}</strong> for <strong>${entityName}</strong> has been conditionally approved on ${today}.</p>
        <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>
        <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">A Loanease representative will be in touch to discuss the conditions and next steps.</p>
        <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for your continued support.</p>`;
      referrerMessage = `
        <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${referrerName},</p>
        <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">We&apos;re thrilled to inform you that the application for your referral <strong>${refDetails}</strong> has been conditionally approved on ${today}.</p>
        <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>
        <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">A Loanease representative will be in touch to discuss the conditions and next steps.</p>
        <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for your continued support.</p>`;
      break;

    case 'declined':
      subject = `${applicationId} - Application Declined`;
      const declineReason = reasonDeclined ? `<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;"><p style="margin: 0; font-size: 14px; color: #991b1b;"><strong>Reason:</strong> ${reasonDeclined}</p></div>` : '';
      clientMessage = `
        <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${clientName},</p>
        <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">We regret to inform you that your application <strong>${refDetails}</strong> has been declined on ${today}.</p>
        <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>
        ${declineReason}
        <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">A Loanease representative will contact you soon to provide further details and discuss any potential alternatives.</p>
        <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for your understanding and support.</p>`;
      referrerMessage = `
        <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${referrerName},</p>
        <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">We regret to inform you that the application for your referral <strong>${refDetails}</strong> has been declined on ${today}.</p>
        <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>
        ${declineReason}
        <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">A Loanease representative will contact you soon to provide further details and discuss any potential alternatives.</p>
        <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for your understanding and support.</p>`;
      break;

    case 'withdrawn':
      subject = `${applicationId} - Application Withdrawn`;
      const withdrawReason = reasonDeclined ? `<div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 4px;"><p style="margin: 0; font-size: 14px; color: #9a3412;"><strong>Reason:</strong> ${reasonDeclined}</p></div>` : '';
      clientMessage = `
        <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${clientName},</p>
        <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Please consider this email as notification that we are withdrawing your application <strong>${refDetails}</strong> on ${today}.</p>
        <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>
        ${withdrawReason}
        <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">A Loanease representative will contact you soon to discuss further.</p>
        <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for your support.</p>`;
      referrerMessage = `
        <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${referrerName},</p>
        <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Please consider this email as notification that we are withdrawing the referral application <strong>${refDetails}</strong> on ${today}.</p>
        <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>
        ${withdrawReason}
        <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">A Loanease representative will contact you soon to discuss further.</p>
        <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for your support.</p>`;
      break;

    default:
      return { clientResult: null, referrerResult: null };
  }

  const results: { clientResult: any; referrerResult: any } = {
    clientResult: null,
    referrerResult: null
  };

  // Send to client if email exists
  if (clientEmail) {
    try {
      results.clientResult = await sendHtmlEmail({
        to: clientEmail,
        subject,
        htmlBody: await wrapInBrandedTemplate(clientMessage, 'Application Update'),
      });
      console.log(`Status change email sent to client: ${clientEmail}`);
    } catch (error) {
      console.error('Error sending status email to client:', error);
      results.clientResult = { success: false, error };
    }
  }

  // Send to referrer if email exists
  if (referrerEmail) {
    try {
      results.referrerResult = await sendHtmlEmail({
        to: referrerEmail,
        subject,
        htmlBody: await wrapInBrandedTemplate(referrerMessage, 'Application Update'),
      });
      console.log(`Status change email sent to referrer: ${referrerEmail}`);
    } catch (error) {
      console.error('Error sending status email to referrer:', error);
      results.referrerResult = { success: false, error };
    }
  }

  return results;
}

// Send confirmation email to referrer when opportunity is created
export async function sendOpportunityConfirmationToReferrer({
  referrerEmail,
  referrerName,
  entityName,
}: {
  referrerEmail: string;
  referrerName: string;
  entityName: string;
}) {
  const statusBadge = `<span style="display: inline-block; background-color: #d1fae5; color: #065f46; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">Referral Received</span>`;

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${referrerName},</p>

    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">We&apos;re excited to let you know that we received your referral for <strong>${entityName}</strong>.</p>

    <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>

    <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">A Loanease representative will reach out shortly to discuss the next steps.</p>

    <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for trusting us with your referrals.</p>
  `;

  return sendHtmlEmail({
    to: referrerEmail,
    subject: 'Loanease - Referral Received',
    htmlBody: await wrapInBrandedTemplate(content, 'Referral Received'),
    from: 'partners@loanease.com',
  });
}

// Send confirmation email to client when opportunity is created
export async function sendOpportunityConfirmationToClient({
  clientEmail,
  clientName,
  entityName,
}: {
  clientEmail: string;
  clientName: string;
  entityName: string;
}) {
  const statusBadge = `<span style="display: inline-block; background-color: #d1fae5; color: #065f46; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">Application Received</span>`;

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${clientName},</p>

    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">We&apos;re excited to let you know that we received your application for <strong>${entityName}</strong>.</p>

    <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>

    <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">A Loanease representative will reach out shortly to discuss the next steps.</p>

    <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for trusting Loanease.</p>
  `;

  return sendHtmlEmail({
    to: clientEmail,
    subject: 'Loanease - Application Received',
    htmlBody: await wrapInBrandedTemplate(content, 'Application Received'),
    from: 'partners@loanease.com',
  });
}

export async function sendNewOpportunityAlert(
  recipientEmail: string,
  details: {
    opportunityId: string;
    borrowerEntityName: string;
    borrowerEmail: string;
    referrerEntity: string;
    referrerEmail: string;
    assetType: string;
    loanAmount: string;
    loanType: string;
    loanPurpose: string;
    icr: string;
    lvr: string;
  }
) {
  const statusBadge = `<span style="display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">New Opportunity</span>`;

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi Team,</p>

    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">A new opportunity <strong>${details.opportunityId}</strong> has been submitted for <strong>${details.borrowerEntityName || 'a new client'}</strong>.</p>

    <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>

    ${emailInfoTable([
      { label: 'Submitted', value: formatIndianDateTime() },
      { label: 'Borrower Entity', value: details.borrowerEntityName || '-' },
      { label: 'Borrower Email', value: details.borrowerEmail || '-' },
      { label: 'Referrer', value: details.referrerEntity || '-' },
      { label: 'Referrer Email', value: details.referrerEmail || '-' },
      { label: 'Asset Type', value: details.assetType || '-' },
      { label: 'Loan Amount', value: details.loanAmount || '-' },
      { label: 'Loan Type', value: details.loanType || '-' },
      { label: 'Loan Purpose', value: details.loanPurpose || '-' },
      { label: 'ICR', value: details.icr || '-' },
      { label: 'LVR', value: details.lvr || '-' },
    ])}

    <div style="text-align: center; margin-top: 25px;">
      ${emailButton('View Opportunity', `${process.env.NEXT_PUBLIC_APP_URL}/admin/opportunities`)}
    </div>
  `;

  return sendHtmlEmail({
    to: recipientEmail,
    subject: `New Opportunity ${details.opportunityId} - Loanease`,
    htmlBody: await wrapInBrandedTemplate(content, 'New Opportunity'),
  });
}