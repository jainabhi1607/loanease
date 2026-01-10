import { sendHtmlEmail, sendHtmlEmailWithAttachment, wrapInBrandedTemplate } from './postmark';
import { getDatabase } from '@/lib/mongodb/client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawLoancaseLogo, LOANCASE_BRAND_COLOR } from '@/lib/pdf-logo';

// Helper to format industry type
function formatIndustryType(industryType: string | null): string {
  if (!industryType) return '-';

  const industryMap: { [key: string]: string } = {
    'accountant': 'Accountant',
    'buyers_advocate': "Buyers' Advocate",
    'conveyancer': 'Conveyancer',
    'financial_adviser': 'Financial Adviser',
    'lawyer': 'Lawyer',
    'mortgage_broker': 'Mortgage Broker',
    'real_estate_agent': 'Real Estate Agent',
    'other': 'Other',
  };

  return industryMap[industryType] || industryType;
}

// Helper to strip HTML tags and decode entities
function stripHtml(html: string): string {
  if (!html) return '';

  let text = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');

  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<li>/gi, '• ');
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return text;
}

// Get email template from global_settings
async function getEmailTemplate(key: string): Promise<string> {
  const db = await getDatabase();
  const setting = await db.collection('global_settings').findOne({ key });
  return setting?.value || '';
}

// Replace template variables
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return result;
}

// Wrap content in HTML email template - uses branded template from postmark.ts
function wrapInEmailTemplate(content: string): string {
  return wrapInBrandedTemplate(content);
}

// Generate PDF for referrer agreement
async function generateReferrerAgreementPDF(params: {
  companyName: string;
  address: string;
  email: string;
  phone: string;
  abn: string;
  industryType: string;
  ipAddress: string;
  agreementDate: Date;
}): Promise<Buffer> {
  const db = await getDatabase();

  // Get global settings
  const settings = await db.collection('global_settings')
    .find({ key: { $in: ['terms_and_conditions', 'referrer_fees'] } })
    .toArray();

  const settingsMap: { [key: string]: string } = {};
  settings?.forEach((s) => {
    settingsMap[s.key] = s.value;
  });

  const termsAndConditions = settingsMap['terms_and_conditions'] || '';
  const referrerFees = settingsMap['referrer_fees'] || '';

  // Create PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // Add logo
  drawLoancaseLogo(doc, margin, 20, { fontSize: 24 });

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Referrer Agreement', margin, 28);

  // Add line separator
  doc.setDrawColor(LOANCASE_BRAND_COLOR.r, LOANCASE_BRAND_COLOR.g, LOANCASE_BRAND_COLOR.b);
  doc.setLineWidth(0.5);
  doc.line(margin, 32, pageWidth - margin, 32);

  // Add Terms & Conditions content
  let yPos = 42;
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  const termsText = stripHtml(termsAndConditions);

  if (termsText) {
    const splitTerms = doc.splitTextToSize(termsText, contentWidth);

    for (let i = 0; i < splitTerms.length; i++) {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(splitTerms[i], margin, yPos);
      yPos += 5;
    }
  }

  // Add new page for Schedule
  doc.addPage();
  yPos = 20;

  // Schedule 3 - Particulars of Agreement
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Schedule 3 - Particulars of Agreement', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Create schedule table
  const scheduleData = [
    ['1', 'CLUE COMMERCIAL', `Party: CLUE COMMERCIAL PTY LTD (ACN 676 426 101)\nAddress: Suite 3 134 Cambridge Street Collingwood VIC 3066\nEmail: partners@cluefinance.com.au\nContact: +61 1300 00 78 78`],
    ['2', 'Referrer', `Party: ${params.companyName}\nAddress: ${params.address}\nEmail: ${params.email}\nContact: ${params.phone}`],
    ['3', 'Services', 'Financial brokerage services for business and commercial loans'],
    ['4', 'Referrer Services', formatIndustryType(params.industryType)],
    ['5', 'Commencement Date', params.agreementDate.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Australia/Sydney' })],
    ['6', 'Referrer Fees', referrerFees || '-'],
    ['7', 'Method of Payment', "Referral fees will be paid typically monthly in arrears as per aggregator / lender payment terms, directly to the Referrer's nominated bank account."],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: scheduleData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 5,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 35, fontStyle: 'bold' },
      2: { cellWidth: contentWidth - 45 },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  // Add approval details
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`IP Address: ${params.ipAddress}`, margin, yPos);
  yPos += 6;
  doc.text(`Date of approval: ${params.agreementDate.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Australia/Sydney' })}`, margin, yPos);
  yPos += 6;
  doc.text(`Time of approval: ${params.agreementDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Australia/Sydney' })}`, margin, yPos);

  return Buffer.from(doc.output('arraybuffer'));
}

export interface SignupEmailParams {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  companyName: string;
  tradingName?: string;
  abn: string;
  address: string;
  phone: string;
  industryType: string;
  ipAddress: string;
}

// 1. Send Welcome Email to new referrer
export async function sendSignupWelcomeEmail(params: SignupEmailParams): Promise<{ success: boolean; error?: any }> {
  try {
    const subjectTemplate = await getEmailTemplate('new_signup_email_subject');
    const contentTemplate = await getEmailTemplate('new_signup_email_content');

    // Determine entity name: company name > trading name > director name
    let entityName = params.companyName;
    if (!entityName && params.tradingName) {
      entityName = params.tradingName;
    }
    if (!entityName) {
      entityName = `${params.firstName} ${params.lastName}`;
    }

    const variables = {
      'Name': params.firstName,
      'UserName': params.email,
      'Password': params.password,
      'Entity Name': entityName,
    };

    const subject = replaceVariables(subjectTemplate, variables);
    const content = replaceVariables(contentTemplate, variables);
    const htmlBody = wrapInEmailTemplate(content);

    return await sendHtmlEmail({
      to: params.email,
      subject,
      htmlBody,
    });
  } catch (error) {
    console.error('Error sending signup welcome email:', error);
    return { success: false, error };
  }
}

// 2. Send Referrer Agreement Email with PDF attachment
export async function sendReferrerAgreementEmail(params: SignupEmailParams): Promise<{ success: boolean; error?: any }> {
  try {
    const subjectTemplate = await getEmailTemplate('referrer_agreement_subject');
    const contentTemplate = await getEmailTemplate('referrer_agreement_content');

    // Determine entity name
    let entityName = params.companyName;
    if (!entityName && params.tradingName) {
      entityName = params.tradingName;
    }
    if (!entityName) {
      entityName = `${params.firstName} ${params.lastName}`;
    }

    const variables = {
      'Name': params.firstName,
      'Entity Name': entityName,
    };

    const subject = replaceVariables(subjectTemplate, variables);
    const content = replaceVariables(contentTemplate, variables);
    const htmlBody = wrapInEmailTemplate(content);

    // Generate PDF
    const pdfBuffer = await generateReferrerAgreementPDF({
      companyName: params.companyName,
      address: params.address,
      email: params.email,
      phone: params.phone,
      abn: params.abn,
      industryType: params.industryType,
      ipAddress: params.ipAddress,
      agreementDate: new Date(),
    });

    // Generate filename
    let filename = 'Loancase-ReferrerAgreement';
    if (params.abn) {
      filename += `-${params.abn.replace(/\s/g, '')}`;
    }
    filename += '.pdf';

    return await sendHtmlEmailWithAttachment({
      to: params.email,
      subject,
      htmlBody,
      attachment: {
        Name: filename,
        Content: pdfBuffer.toString('base64'),
        ContentType: 'application/pdf',
      },
    });
  } catch (error) {
    console.error('Error sending referrer agreement email:', error);
    return { success: false, error };
  }
}

// 3. Send New Broker Alert Email to admin team
export async function sendNewBrokerAlertEmail(params: SignupEmailParams): Promise<{ success: boolean; error?: any }> {
  try {
    const subjectTemplate = await getEmailTemplate('new_broker_email_subject');
    const contentTemplate = await getEmailTemplate('new_broker_email_content');
    const alertEmails = await getEmailTemplate('new_broker_alert');

    if (!alertEmails) {
      console.log('No new_broker_alert emails configured');
      return { success: true };
    }

    // Determine entity name
    let entityName = params.companyName;
    if (!entityName && params.tradingName) {
      entityName = params.tradingName;
    }
    if (!entityName) {
      entityName = `${params.firstName} ${params.lastName}`;
    }

    const variables = {
      'Referrer-Entity-Name': entityName,
      'Company-Name': params.companyName || '-',
      'Director-Name': `${params.firstName} ${params.lastName}`,
      'Contact-Phone': params.phone || '-',
      'Contact-Email': params.email || '-',
      'ABN': params.abn || '-',
      'Trading-Name': params.tradingName || '',
      'Address': params.address || '-',
      'Industry-Type': formatIndustryType(params.industryType),
    };

    const subject = replaceVariables(subjectTemplate, variables);
    const content = replaceVariables(contentTemplate, variables);
    const htmlBody = wrapInEmailTemplate(content);

    // Parse email list (one per line)
    const emails = alertEmails
      .split('\n')
      .map((email: string) => email.trim())
      .filter((email: string) => email && email.includes('@'));

    // Send to each recipient
    const results = await Promise.all(
      emails.map((email: string) =>
        sendHtmlEmail({
          to: email,
          subject,
          htmlBody,
        })
      )
    );

    const allSuccess = results.every(r => r.success);
    return { success: allSuccess, error: allSuccess ? undefined : 'Some emails failed' };
  } catch (error) {
    console.error('Error sending new broker alert email:', error);
    return { success: false, error };
  }
}

// Send New User/Team Member Welcome Email
export async function sendNewUserWelcomeEmail(params: {
  email: string;
  firstName: string;
  password: string;
  companyName: string;
}): Promise<{ success: boolean; error?: any; messageId?: string }> {
  try {
    const subjectTemplate = await getEmailTemplate('new_user_subject');
    const contentTemplate = await getEmailTemplate('new_user_content');

    const variables = {
      'Name': params.firstName,
      'UserName': params.email,
      'Password': params.password,
    };

    const subject = replaceVariables(subjectTemplate, variables) || 'Welcome to Loancase';
    const content = replaceVariables(contentTemplate, variables);
    const htmlBody = wrapInEmailTemplate(content);

    console.log('Sending new user welcome email to:', params.email);
    console.log('Email subject:', subject);

    const result = await sendHtmlEmail({
      to: params.email,
      subject,
      htmlBody,
      from: 'partners@cluefinance.com.au',
    });

    if (result.success) {
      console.log('Email sent successfully with messageId:', result.messageId);
    } else {
      console.error('Email failed to send:', result.error);
    }

    return result;
  } catch (error) {
    console.error('Error sending new user welcome email:', error);
    return { success: false, error };
  }
}

// Send all signup emails
export async function sendAllSignupEmails(params: SignupEmailParams): Promise<void> {
  try {
    // Send all 3 emails in parallel
    const [welcomeResult, agreementResult, alertResult] = await Promise.all([
      sendSignupWelcomeEmail(params),
      sendReferrerAgreementEmail(params),
      sendNewBrokerAlertEmail(params),
    ]);

    if (!welcomeResult.success) {
      console.error('Failed to send welcome email:', welcomeResult.error);
    }
    if (!agreementResult.success) {
      console.error('Failed to send agreement email:', agreementResult.error);
    }
    if (!alertResult.success) {
      console.error('Failed to send broker alert email:', alertResult.error);
    }
  } catch (error) {
    console.error('Error sending signup emails:', error);
  }
}
