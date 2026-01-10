import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/client';

// GET - Fetch the default interest rate (public endpoint for ICR calculations)
export async function GET() {
  try {
    const db = await getDatabase();

    const setting = await db.collection('global_settings').findOne({
      key: 'default_interest_rate'
    });

    if (!setting) {
      // Return default value if setting not found
      return NextResponse.json({ interestRate: 8.5 });
    }

    const interestRate = parseFloat(setting.value) || 8.5;

    return NextResponse.json({ interestRate });
  } catch (error) {
    console.error('Error in interest rate API:', error);
    // Return default value on error
    return NextResponse.json({ interestRate: 8.5 });
  }
}
