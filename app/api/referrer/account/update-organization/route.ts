import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

export async function PATCH(request: NextRequest) {
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

    // Check if user is a referrer admin (only admins can update org details)
    if (userData.role !== 'referrer_admin') {
      return NextResponse.json({ error: 'Forbidden - Only admins can update organization details' }, { status: 403 });
    }

    const organisationId = userData.organisation_id;

    if (!organisationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const body = await request.json();
    const { company_name, trading_name, abn, address, industry_type, entity_type, directors } = body;

    // Update organization
    const updateData: Record<string, any> = {};
    if (company_name) updateData.company_name = company_name;
    if (trading_name) updateData.trading_name = trading_name;
    if (abn) updateData.abn = abn;
    if (address) updateData.address = address;
    if (industry_type) updateData.industry_type = industry_type;
    if (entity_type) updateData.entity_type = entity_type;

    if (Object.keys(updateData).length > 0) {
      await db.collection(COLLECTIONS.ORGANISATIONS).updateOne(
        { _id: organisationId as any },
        { $set: updateData }
      );
    }

    // Update directors if provided
    if (directors && Array.isArray(directors)) {
      // Delete existing directors
      await db.collection(COLLECTIONS.ORGANISATION_DIRECTORS).deleteMany({
        organisation_id: organisationId
      });

      // Insert new directors
      if (directors.length > 0) {
        const directorRecords = directors
          .filter((d: any) => d.firstName && d.surname) // Only insert directors with names
          .map((d: any) => ({
            organisation_id: organisationId,
            first_name: d.firstName,
            surname: d.surname,
            email: d.email || null,
            phone: d.phone || null,
            created_at: new Date(),
          }));

        if (directorRecords.length > 0) {
          await db.collection(COLLECTIONS.ORGANISATION_DIRECTORS).insertMany(directorRecords);
        }
      }
    }

    // Log the update in audit_logs
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      user_id: user.userId,
      table_name: 'organisations',
      record_id: organisationId,
      action: 'update',
      changes: updateData,
      created_at: new Date(),
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
