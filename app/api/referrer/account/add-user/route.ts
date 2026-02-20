import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { sendNewUserWelcomeEmail } from '@/lib/email/signup-emails';
import { hashPassword } from '@/lib/auth/password';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();

    // Get user role and organization
    const userData = await db.collection(COLLECTIONS.USERS).findOne({ _id: user.userId as any });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a referrer admin
    if (userData.role !== 'referrer_admin') {
      return NextResponse.json({ error: 'Forbidden - Only admins can add users' }, { status: 403 });
    }

    const organisationId = userData.organisation_id;

    if (!organisationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const body = await request.json();
    const { first_name, surname, phone, email, state, role, status } = body;

    // Validate required fields
    if (!first_name || !surname || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if email already exists in auth_users
    const existingAuthUser = await db.collection(COLLECTIONS.AUTH_USERS).findOne({ email: email });

    if (existingAuthUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Generate a temporary password (user will reset it via welcome email)
    const generateTempPassword = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };
    const tempPassword = generateTempPassword();

    console.log('Creating new user with email:', email);

    // Generate new user ID
    const newUserId = uuidv4();

    // Hash the password
    const hashedPassword = await hashPassword(tempPassword);

    // Create user in auth_users collection
    await db.collection(COLLECTIONS.AUTH_USERS).insertOne({
      _id: newUserId as any,
      email: email,
      password_hash: hashedPassword,
      email_confirmed: true,
      created_at: new Date(),
      user_metadata: {
        first_name,
        surname,
        phone,
        state,
      }
    });

    console.log('Auth user created:', newUserId);

    // Create user profile in users collection
    await db.collection(COLLECTIONS.USERS).insertOne({
      _id: newUserId as any,
      email: email,
      first_name: first_name,
      surname: surname,
      phone: phone,
      role: role,
      organisation_id: organisationId,
      status: status || 'active',
      created_at: new Date(),
    });

    console.log('User profile created successfully');

    // Get organization details for the welcome email
    const orgData = await db.collection(COLLECTIONS.ORGANISATIONS).findOne({ _id: organisationId as any });

    // Send welcome email only (referrer agreement email is only sent during initial referrer signup)
    try {
      const emailResult = await sendNewUserWelcomeEmail({
        email: email,
        firstName: first_name,
        password: tempPassword,
        companyName: orgData?.company_name || 'Loanease',
      });

      if (!emailResult.success) {
        console.error('Failed to send welcome email');
      } else {
        console.log('Welcome email sent successfully to:', email);
      }
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the user creation if email fails
    }

    // Log the action in audit_logs
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      user_id: user.userId,
      table_name: 'users',
      action: 'create',
      changes: {
        email,
        role,
        organization_id: organisationId,
        created_user_id: newUserId,
      },
      created_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
    });

  } catch (error) {
    console.error('Error adding user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
