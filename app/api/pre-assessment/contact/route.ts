import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '@/lib/mongodb/client';

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

    const body = await request.json();
    const { firstName, lastName, email, phone, loanAmount, propertyValue, lvr, icr } = body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if user already exists in users table
    const existingUser = await db.collection('users').findOne({
      email: email.toLowerCase(),
      deleted_at: null
    });

    if (existingUser) {
      // User exists in system
      return NextResponse.json({
        success: true,
        message: 'Assessment calculated successfully',
        userExists: true,
      });
    }

    // Save to pre_assessment_contacts table (only basic contact info)
    await db.collection('pre_assessment_contacts').insertOne({
      _id: uuidv4() as any,
      first_name: firstName,
      last_name: lastName,
      email: email.toLowerCase(),
      phone: phone || null,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Assessment calculated successfully',
      userExists: false,
    });

  } catch (error) {
    console.error('Error in pre-assessment contact API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
