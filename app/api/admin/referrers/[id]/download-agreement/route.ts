import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addLoaneaseLogoImage, LOANCASE_BRAND_COLOR } from '@/lib/pdf-logo';
import { getCompanyPhone, getCompanyAddress, getCompanyEmail } from '@/lib/mongodb/repositories/global-settings';

// Helper to strip HTML tags and decode entities
function stripHtml(html: string): string {
  if (!html) return '';

  // Replace common HTML entities
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

  // Replace <br> and </p> with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');

  // Add bullet points for list items
  text = text.replace(/<li>/gi, '• ');

  // Remove all other HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // Clean up multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  // Trim whitespace
  text = text.trim();

  return text;
}

// Helper to format industry type
function formatIndustryType(industryType: string | null): string {
  if (!industryType) return '-';

  const industryMap: { [key: string]: string } = {
    'accountant': 'Accountant',
    'financial_planner': 'Financial Planner',
    'mortgage_broker': 'Mortgage Broker',
    'real_estate_agent': 'Real Estate Agent',
    'solicitor': 'Solicitor/Lawyer',
    'business_broker': 'Business Broker',
    'other': 'Other',
  };

  return industryMap[industryType] || industryType;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'super_admin' && user.role !== 'admin_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDatabase();

    // Get the referrer user details
    const referrerUser = await db.collection('users').findOne({ _id: id as any });

    if (!referrerUser || !referrerUser.organisation_id) {
      return NextResponse.json({ error: 'Referrer not found' }, { status: 404 });
    }

    // Get organization details
    const organization = await db.collection('organisations').findOne({
      _id: referrerUser.organisation_id
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get global settings (terms_and_conditions, referrer_fees)
    const settings = await db.collection('global_settings')
      .find({ key: { $in: ['terms_and_conditions', 'referrer_fees'] } })
      .toArray();

    const settingsMap: { [key: string]: string } = {};
    settings?.forEach((s: any) => {
      settingsMap[s.key] = s.value;
    });

    const termsAndConditions = settingsMap['terms_and_conditions'] || '';
    const referrerFees = settingsMap['referrer_fees'] || '';

    const orgData = organization as any;
    const userData = referrerUser as any;

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    // Add logo image
    addLoaneaseLogoImage(doc, margin, 10, { width: 35, height: 12 });

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

    // Use agreement_date for Commencement Date (same as approval date)
    const commencementDateStr = orgData.agreement_date || userData.created_at;
    const commencementDate = new Date(commencementDateStr);

    // Get company details from settings
    const [companyPhone, companyAddress, companyEmail] = await Promise.all([
      getCompanyPhone(),
      getCompanyAddress(),
      getCompanyEmail(),
    ]);

    // Create schedule table
    const scheduleData = [
      ['1', 'LOANEASE', `Party: LOANEASE PTY LTD\nAddress: ${companyAddress}\nEmail: ${companyEmail}\nContact: ${companyPhone}`],
      ['2', 'Referrer', `Party: ${orgData.company_name || '-'}\nAddress: ${orgData.address || '-'}\nEmail: ${userData.email || '-'}\nContact: ${orgData.phone || userData.phone || '-'}`],
      ['3', 'Services', 'Financial brokerage services for business and commercial loans'],
      ['4', 'Referrer Services', formatIndustryType(orgData.industry_type)],
      ['5', 'Commencement Date', commencementDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' })],
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

    // Use agreement_date if available, otherwise fall back to user created_at
    const approvalDateStr = orgData.agreement_date || userData.created_at;
    const approvalDate = new Date(approvalDateStr);
    const agreementIp = orgData.agreement_ip || 'Not recorded';

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date of approval: ${approvalDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}`, margin, yPos);
    yPos += 6;
    doc.text(`Time of approval: ${approvalDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} IST`, margin, yPos);
    yPos += 6;
    doc.text(`IP Address: ${agreementIp}`, margin, yPos);

    // Generate filename
    let filename = 'Loanease-ReferrerAgreement';
    if (orgData.abn) {
      filename += `-${orgData.abn.replace(/\s/g, '')}`;
    }
    filename += '.pdf';

    // Get PDF as buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Return PDF response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating agreement PDF:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
