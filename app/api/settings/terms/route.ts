import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/client';

// GET - Fetch terms and conditions (public endpoint for signup)
export async function GET() {
  try {
    const db = await getDatabase();

    const setting = await db.collection('global_settings').findOne({
      key: 'terms_and_conditions'
    });

    if (!setting) {
      return NextResponse.json({ terms: null });
    }

    return NextResponse.json({ terms: setting.value || null });

  } catch (error) {
    console.error('Error in terms API:', error);
    return NextResponse.json({ terms: null });
  }
}
