import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '@/lib/auth/password';
import { findUserByEmail, createUser } from '@/lib/mongodb/repositories/users';
import { findOrganisationByABN, createOrganisation, createOrganisationDirector } from '@/lib/mongodb/repositories/organisations';
import { createAuditLog } from '@/lib/mongodb/repositories/audit-logs';

// Validation schema for mobile signup
const mobileSignupSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  surname: z.string().min(1, 'Surname is required'),
  phone: z.string().min(8, 'Phone is required'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  abn: z.string().min(11, 'ABN is required'),
  entity_name: z.string().min(1, 'Company name is required'),
  trading_name: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  entity_type: z.string().min(1, 'Entity type is required'),
  industry_type: z.string().min(1, 'Industry type is required'),
  additional_directors: z.array(z.object({
    first_name: z.string(),
    surname: z.string()
  })).optional(),
  terms_accepted: z.boolean().refine(val => val === true, 'You must accept the terms')
});

export async function POST(request: NextRequest) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  try {
    const body = await request.json();

    // Validate data
    const validationResult = mobileSignupSchema.safeParse(body);
    if (!validationResult.success) {
      console.log('Mobile signup validation failed:', validationResult.error.issues);
      return NextResponse.json(
        {
          error: validationResult.error.issues[0]?.message || 'Invalid form data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if email already exists
    const existingUser = await findUserByEmail(data.email.toLowerCase());
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Clean ABN (remove spaces)
    const cleanABN = data.abn.replace(/\s/g, '');

    // Check if ABN already exists
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
      company_name: data.entity_name,
      entity_name: data.entity_name,
      trading_name: data.trading_name || null,
      abn: cleanABN,
      address: data.address,
      entity_type: data.entity_type,
      industry_type: data.industry_type,
      phone: data.phone,
      is_active: true,
      agreement_ip: ip,
      agreement_date: new Date().toISOString(),
      created_at: new Date().toISOString()
    });

    if (!organisation) {
      console.error('Error creating organisation');
      return NextResponse.json(
        { error: 'Failed to create organisation. Please try again.' },
        { status: 500 }
      );
    }

    // Create user
    const user = await createUser({
      _id: userId,
      email: data.email.toLowerCase(),
      password_hash: passwordHash,
      organisation_id: orgId,
      first_name: data.first_name,
      surname: data.surname,
      phone: data.phone,
      role: 'referrer_admin',
      two_fa_enabled: false,
      is_active: true,
      email_verified: true, // Skip email verification for mobile
      created_at: new Date().toISOString()
    });

    if (!user) {
      console.error('Error creating user');
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
        first_name: data.first_name,
        surname: data.surname,
        email: data.email.toLowerCase(),
        phone: data.phone,
        is_primary: true,
        created_at: new Date().toISOString()
      });
    } catch (directorError) {
      console.error('Error creating director record:', directorError);
    }

    // Create additional directors if any
    if (data.additional_directors && data.additional_directors.length > 0) {
      for (const director of data.additional_directors) {
        if (director.first_name && director.surname) {
          try {
            await createOrganisationDirector({
              _id: uuidv4() as any,
              organisation_id: orgId,
              first_name: director.first_name,
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

    // Log successful signup
    try {
      await createAuditLog({
        user_id: userId,
        table_name: 'organisations',
        record_id: orgId,
        action: 'create',
        field_name: 'mobile_signup',
        old_value: null,
        new_value: `New organisation (mobile): ${data.entity_name}`,
        description: 'New organisation signup via mobile app',
        ip_address: ip,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      });
    } catch (auditError) {
      console.error('Error logging signup:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now log in.',
      userId: userId
    });

  } catch (error) {
    console.error('Mobile signup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
