import { NextResponse } from 'next/server';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

export async function GET() {
  try {
    const db = await getDatabase();
    const setting = await db.collection(COLLECTIONS.GLOBAL_SETTINGS).findOne({
      key: 'loan_declined_reasons'
    });

    let reasons: string[] = [];
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        reasons = Array.isArray(parsed) ? parsed.map((r: string) => r.trim()).filter(Boolean) : [];
      } catch {
        reasons = [];
      }
    }

    return NextResponse.json({ reasons });
  } catch (error) {
    console.error('Error fetching loan declined reasons:', error);
    return NextResponse.json({ reasons: [] });
  }
}
