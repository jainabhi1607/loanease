import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '@/lib/auth/password';
import { findUserByEmail, createUser } from '@/lib/mongodb/repositories/users';
import { findOrganisationByABN, createOrganisation, createOrganisationDirector } from '@/lib/mongodb/repositories/organisations';
import { createEmailVerificationToken } from '@/lib/mongodb/repositories/auth';
import { createAuditLog } from '@/lib/mongodb/repositories/audit-logs';
import { sendVerificationEmail } from '@/lib/email/postmark';
import { getMaxLoginAttempts, getLockoutDurationMinutes, getEmailVerificationExpiryHours, getBlockedEmailDomains } from '@/lib/mongodb/repositories/global-settings';

// Rate limiting store for signup attempts
const signupAttempts = new Map<string, { count: number; firstAttempt: number; blockedUntil?: number }>();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of signupAttempts.entries()) {
    if (now - value.firstAttempt > 3600000) { // 1 hour
      signupAttempts.delete(key);
    }
  }
}, 3600000);

// Validation schema with custom error messages
const signupSchema = z.object({
  directorFirstName: z.string().min(1, 'Director first name is required').max(100, 'Director first name is too long'),
  directorSurname: z.string().min(1, 'Director surname is required').max(100, 'Director surname is too long'),
  contactPhone: z.string().min(10, 'Phone number must be at least 10 digits').max(20, 'Phone number is too long'),
  contactEmail: z.string().email('Please enter a valid email address'),
  abn: z.string().regex(/^\d{2}\s\d{3}\s\d{3}\s\d{3}$/, 'ABN must be in the format XX XXX XXX XXX'),
  companyName: z.string().min(1, 'Company name is required').max(200, 'Company name is too long'),
  tradingName: z.string().max(200, 'Trading name is too long').optional(),
  companyAddress: z.string().min(1, 'Company address is required').max(500, 'Company address is too long'),
  companySuburb: z.string().max(100, 'Suburb is too long').optional(),
  companyState: z.string().max(10, 'State is too long').optional(),
  companyPostcode: z.string().max(10, 'Postcode is too long').optional(),
  numberOfAdditionalDirectors: z.string(),
  additionalDirectors: z.array(z.object({
    firstName: z.string(),
    surname: z.string()
  })),
  entity: z.string().min(1, 'Entity type is required'),
  industryType: z.string().min(1, 'Industry type is required'),
  password: z.string().min(10, 'Password must be at least 10 characters').max(100, 'Password is too long'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the Terms and Conditions')
});

export async function POST(request: NextRequest) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  try {
    // Validate CSRF token
    const csrfHeader = headersList.get('x-csrf-token');
    if (!csrfHeader) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }

    // Rate limiting check
    const attemptKey = `signup-${ip}`;
    const attempts = signupAttempts.get(attemptKey);
    const now = Date.now();

    if (attempts) {
      // Check if IP is blocked
      if (attempts.blockedUntil && attempts.blockedUntil > now) {
        const minutesLeft = Math.ceil((attempts.blockedUntil - now) / 60000);
        return NextResponse.json(
          { error: `Too many signup attempts. Please try again in ${minutesLeft} minutes.` },
          { status: 429 }
        );
      }

      // Reset attempts if window expired (15 minutes)
      if (now - attempts.firstAttempt > 900000) {
        signupAttempts.delete(attemptKey);
      } else {
        const maxAttempts = await getMaxLoginAttempts();
        const lockoutMinutes = await getLockoutDurationMinutes();
        if (attempts.count >= maxAttempts) {
          attempts.blockedUntil = now + lockoutMinutes * 60 * 1000;
          signupAttempts.set(attemptKey, attempts);

          return NextResponse.json(
            { error: `Too many signup attempts. Please try again in ${lockoutMinutes} minutes.` },
            { status: 429 }
          );
        }
      }
    }

    // Parse and validate request body
    const body = await request.json();

    // Verify CSRF token matches header
    if (!body.csrfToken || body.csrfToken !== csrfHeader) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }

    // Validate data
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      // Log failed attempt
      const currentAttempts = signupAttempts.get(attemptKey) || { count: 0, firstAttempt: now };
      currentAttempts.count++;
      signupAttempts.set(attemptKey, currentAttempts);

      console.log('Signup validation failed:', JSON.stringify(validationResult.error.issues, null, 2));

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
      contactEmail: data.contactEmail.toLowerCase(), // Don't sanitize email as it needs special chars
      companyName: DOMPurify.sanitize(data.companyName),
      tradingName: data.tradingName ? DOMPurify.sanitize(data.tradingName) : undefined,
      companyAddress: DOMPurify.sanitize(data.companyAddress),
      companySuburb: data.companySuburb ? DOMPurify.sanitize(data.companySuburb) : undefined,
      companyState: data.companyState ? DOMPurify.sanitize(data.companyState) : undefined,
      companyPostcode: data.companyPostcode ? DOMPurify.sanitize(data.companyPostcode) : undefined,
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

    // Validate email isn't disposable
    const blockedDomains = await getBlockedEmailDomains();
    const domain = sanitizedData.contactEmail.split('@')[1]?.toLowerCase();
    if (blockedDomains.includes(domain)) {
      return NextResponse.json(
        { error: 'Disposable email addresses are not allowed' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await findUserByEmail(sanitizedData.contactEmail);
    if (existingUser) {
      // Log failed attempt
      const currentAttempts = signupAttempts.get(attemptKey) || { count: 0, firstAttempt: now };
      currentAttempts.count++;
      signupAttempts.set(attemptKey, currentAttempts);

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

    // Generate user ID
    const userId = uuidv4();

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create organisation
    const orgId = uuidv4();
    const organisation = await createOrganisation({
      _id: orgId,
      company_name: sanitizedData.companyName,
      trading_name: sanitizedData.tradingName || null,
      abn: cleanABN,
      address: sanitizedData.companyAddress,
      suburb: sanitizedData.companySuburb || null,
      state: sanitizedData.companyState || null,
      postcode: sanitizedData.companyPostcode || null,
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

    // Create user
    const user = await createUser({
      _id: userId,
      email: sanitizedData.contactEmail,
      password_hash: passwordHash,
      organisation_id: orgId,
      first_name: sanitizedData.directorFirstName,
      surname: sanitizedData.directorSurname,
      phone: sanitizedData.contactPhone,
      role: 'referrer_admin', // First user is admin
      two_fa_enabled: false,
      is_active: true,
      email_verified: false,
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

    // Log successful signup
    try {
      await createAuditLog({
        user_id: userId,
        table_name: 'organisations',
        record_id: orgId,
        action: 'create',
        field_name: 'signup',
        old_value: null,
        new_value: `New organisation: ${sanitizedData.companyName}`,
        description: 'New organisation signup',
        ip_address: ip,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      });
    } catch (auditError) {
      console.error('Error logging signup:', auditError);
    }

    // Clear rate limit on success
    signupAttempts.delete(attemptKey);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiryHours = await getEmailVerificationExpiryHours();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + verificationExpiryHours);

    // Store verification token with signup data for post-verification emails
    const signupData = {
      email: sanitizedData.contactEmail,
      firstName: sanitizedData.directorFirstName,
      lastName: sanitizedData.directorSurname,
      password: data.password, // Original password for welcome email
      companyName: sanitizedData.companyName,
      tradingName: sanitizedData.tradingName,
      abn: cleanABN,
      address: sanitizedData.companyAddress,
      phone: sanitizedData.contactPhone,
      industryType: sanitizedData.industryType,
      ipAddress: ip,
    };

    await createEmailVerificationToken({
      _id: uuidv4() as any,
      user_id: userId,
      token: verificationToken,
      expires_at: expiresAt.toISOString(),
      signup_data: signupData,
      created_at: new Date().toISOString()
    });

    // EMAIL DISABLED: Email sending is disabled until a new email service provider is configured.
    // try {
    //   await sendVerificationEmail(
    //     sanitizedData.contactEmail,
    //     sanitizedData.directorFirstName,
    //     verificationToken,
    //     sanitizedData.companyName
    //   );
    // } catch (emailError) {
    //   console.error('Error sending verification email:', emailError);
    // }
    console.log(`[EMAIL DISABLED] Verification email for ${sanitizedData.contactEmail}`);

    // Don't auto-login - redirect to verification pending page
    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      userId: userId,
      email: sanitizedData.contactEmail,
      requiresVerification: true
    });

  } catch (error) {
    console.error('Signup error:', error);

    // Log failed attempt
    const attemptKey = `signup-${ip}`;
    const currentAttempts = signupAttempts.get(attemptKey) || { count: 0, firstAttempt: Date.now() };
    currentAttempts.count++;
    signupAttempts.set(attemptKey, currentAttempts);

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
