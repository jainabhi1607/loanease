import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';
import { v4 as uuidv4 } from 'uuid';

// GET - Fetch custom commission split for an organization
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

    // Get the referrer user to find their organization
    const referrerUser = await db.collection('users').findOne({ _id: id as any });

    if (!referrerUser || !referrerUser.organisation_id) {
      return NextResponse.json({ error: 'Referrer not found' }, { status: 404 });
    }

    // Get custom commission split from organisation_details
    const orgDetails = await db.collection('organisation_details').findOne({
      organisation_id: referrerUser.organisation_id
    });

    return NextResponse.json({
      commission_split: orgDetails?.commission_split || null,
    });

  } catch (error) {
    console.error('Error fetching commission split:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Save custom commission split for an organization
export async function POST(
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

    // Get the referrer user to find their organization
    const referrerUser = await db.collection('users').findOne({ _id: id as any });

    if (!referrerUser || !referrerUser.organisation_id) {
      return NextResponse.json({ error: 'Referrer not found' }, { status: 404 });
    }

    const body = await request.json();
    const { commission_split } = body;
    const organisationId = referrerUser.organisation_id;

    // Upsert into organisation_details collection
    await db.collection('organisation_details').updateOne(
      { organisation_id: organisationId },
      {
        $set: {
          organisation_id: organisationId,
          commission_split: commission_split || null,
        },
        $setOnInsert: {
          _id: uuidv4() as any,
          created_at: new Date().toISOString()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving commission split:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
