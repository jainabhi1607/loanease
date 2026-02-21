import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';
import { hashPassword } from '@/lib/auth/password';
import { findUserByEmail, createUser } from '@/lib/mongodb/repositories/users';
import { findOrganisationByABN, createOrganisation, createOrganisationDirector } from '@/lib/mongodb/repositories/organisations';
import { createAuditLog } from '@/lib/mongodb/repositories/audit-logs';
import { sendNewReferrerAlert } from '@/lib/email/postmark';

// Validation schema
const createReferrerSchema = z.object({
  directorFirstName: z.string().min(1).max(100),
  directorSurname: z.string().min(1).max(100),
  contactPhone: z.string().min(10).max(20),
  contactEmail: z.string().email(),
  abn: z.string().regex(/^\d{2}\s\d{3}\s\d{3}\s\d{3}$/),
  companyName: z.string().min(1).max(200),
  tradingName: z.string().max(200).optional(),
  companyAddress: z.string().min(1).max(500),
  numberOfAdditionalDirectors: z.string(),
  additionalDirectors: z.array(z.object({
    firstName: z.string(),
    surname: z.string()
  })),
  entity: z.string().min(1),
  industryType: z.string().min(1),
  password: z.string().min(8).max(100),
  confirmPassword: z.string(),
});

export async function POST(request: NextRequest) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

  try {
    // Verify admin role
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'super_admin' && user.role !== 'admin_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();

    // Validate data
    const validationResult = createReferrerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid form data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Sanitize all string inputs to prevent XSS
    const sanitizedData = {
      ...data,
      directorFirstName: DOMPurify.sanitize(data.directorFirstName),
      directorSurname: DOMPurify.sanitize(data.directorSurname),
      contactPhone: DOMPurify.sanitize(data.contactPhone),
      contactEmail: data.contactEmail.toLowerCase(),
      companyName: DOMPurify.sanitize(data.companyName),
      tradingName: data.tradingName ? DOMPurify.sanitize(data.tradingName) : undefined,
      companyAddress: DOMPurify.sanitize(data.companyAddress),
      additionalDirectors: data.additionalDirectors.map(d => ({
        firstName: DOMPurify.sanitize(d.firstName),
        surname: DOMPurify.sanitize(d.surname)
      }))
    };

    // Check passwords match
    if (data.password !== data.confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await findUserByEmail(sanitizedData.contactEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Check if ABN already exists in organisations
    const cleanABN = sanitizedData.abn.replace(/\s/g, '');
    const existingOrg = await findOrganisationByABN(cleanABN);
    if (existingOrg) {
      return NextResponse.json(
        { error: 'An organisation with this ABN already exists' },
        { status: 400 }
      );
    }

    // Generate IDs
    const userId = uuidv4();
    const orgId = uuidv4();

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create organisation
    const organisation = await createOrganisation({
      _id: orgId,
      company_name: sanitizedData.companyName,
      trading_name: sanitizedData.tradingName || null,
      abn: cleanABN,
      address: sanitizedData.companyAddress,
      entity_type: sanitizedData.entity,
      industry_type: sanitizedData.industryType,
      phone: sanitizedData.contactPhone,
      is_active: true,
      created_at: new Date().toISOString()
    });

    if (!organisation) {
      console.error('Error creating organisation');
      return NextResponse.json(
        { error: 'Failed to create organisation. Please try again.' },
        { status: 500 }
      );
    }

    // Create user profile
    const newUser = await createUser({
      _id: userId,
      email: sanitizedData.contactEmail,
      password_hash: passwordHash,
      organisation_id: orgId,
      first_name: sanitizedData.directorFirstName,
      surname: sanitizedData.directorSurname,
      phone: sanitizedData.contactPhone,
      role: 'referrer_admin', // Admin-created users are always referrer_admin
      two_fa_enabled: false,
      is_active: true,
      email_verified: true, // Admin creates verified users
      created_at: new Date().toISOString()
    });

    if (!newUser) {
      // If user creation fails, we should ideally clean up the org
      const db = await getDatabase();
      await db.collection('organisations').deleteOne({ _id: orgId as any });
      console.error('Error creating user profile');
      return NextResponse.json(
        { error: 'Failed to complete registration. Please try again.' },
        { status: 500 }
      );
    }

    // Create primary director record
    try {
      await createOrganisationDirector({
        _id: uuidv4() as any,
        organisation_id: orgId,
        first_name: sanitizedData.directorFirstName,
        surname: sanitizedData.directorSurname,
        email: sanitizedData.contactEmail,
        phone: sanitizedData.contactPhone,
        is_primary: true,
        created_at: new Date().toISOString()
      });
    } catch (directorError) {
      console.error('Error creating director record:', directorError);
    }

    // Create additional directors if any
    if (sanitizedData.additionalDirectors && sanitizedData.additionalDirectors.length > 0) {
      for (const director of sanitizedData.additionalDirectors) {
        if (director.firstName && director.surname) {
          try {
            await createOrganisationDirector({
              _id: uuidv4() as any,
              organisation_id: orgId,
              first_name: director.firstName,
              surname: director.surname,
              is_primary: false,
              created_at: new Date().toISOString()
            });
          } catch (addDirError) {
            console.error('Error creating additional director:', addDirError);
          }
        }
      }
    }

    // Log the creation
    try {
      await createAuditLog({
        user_id: user.userId,
        table_name: 'organisations',
        record_id: orgId,
        action: 'create',
        field_name: 'admin_created',
        old_value: null,
        new_value: `New organisation created by admin: ${sanitizedData.companyName}`,
        description: null,
        ip_address: ip,
        user_agent: headersList.get('user-agent') || 'unknown',
        created_at: new Date().toISOString()
      });
    } catch (auditError) {
      console.error('Error logging creation:', auditError);
    }

    // EMAIL DISABLED: Email sending is disabled until a new email service provider is configured.
    // try {
    //   const db = await getDatabase();
    //   const alertSetting = await db.collection('global_settings').findOne({ key: 'new_referrer_alert_emails' });
    //   if (alertSetting?.value) {
    //     const emails = alertSetting.value.split('\n').map((email: string) => email.trim()).filter((email: string) => email && email.includes('@'));
    //     const alertDetails = { directorName: `${sanitizedData.directorFirstName} ${sanitizedData.directorSurname}`, companyName: sanitizedData.companyName, contactEmail: sanitizedData.contactEmail, contactPhone: sanitizedData.contactPhone, abn: cleanABN, tradingName: sanitizedData.tradingName, address: sanitizedData.companyAddress, industryType: sanitizedData.industryType };
    //     await Promise.all(emails.map((email: string) => sendNewReferrerAlert(email, alertDetails)));
    //   }
    // } catch (emailError) {
    //   console.error('Error sending new referrer alert emails:', emailError);
    // }
    console.log(`[EMAIL DISABLED] New referrer alert email for ${sanitizedData.contactEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Referrer created successfully',
      userId: userId,
      organisationId: orgId
    });

  } catch (error) {
    console.error('Create referrer error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
