import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';
import { hashPassword } from '@/lib/auth/password';
import { createAuditLog } from '@/lib/mongodb/repositories/audit-logs';

// Validation schema
const updateReferrerSchema = z.object({
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
    id: z.string().optional(),
    firstName: z.string().min(1),
    surname: z.string().min(1),
    email: z.union([z.string().email(), z.literal(''), z.null(), z.undefined()]).optional(),
    phone: z.union([z.string(), z.literal(''), z.null(), z.undefined()]).optional(),
  })),
  entity: z.string().min(1),
  industryType: z.string().min(1),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    const db = await getDatabase();

    // Parse and validate request body
    const body = await request.json();

    // Validate data
    const validationResult = updateReferrerSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.issues);
      return NextResponse.json(
        { error: 'Invalid form data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Sanitize all string inputs
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
        id: d.id,
        firstName: DOMPurify.sanitize(d.firstName),
        surname: DOMPurify.sanitize(d.surname),
        email: d.email,
        phone: d.phone
      }))
    };

    // Get referrer to find user_id and organisation_id
    const referrerData = await db.collection('users').findOne({ _id: id as any });

    if (!referrerData) {
      return NextResponse.json(
        { error: 'Referrer not found' },
        { status: 404 }
      );
    }

    const cleanABN = sanitizedData.abn.replace(/\s/g, '');
    const organisationId = referrerData.organisation_id;

    // Check if ABN changed and if new ABN exists
    const currentOrg = await db.collection('organisations').findOne({ _id: organisationId as any });

    if (currentOrg && currentOrg.abn !== cleanABN) {
      const existingOrg = await db.collection('organisations').findOne({
        abn: cleanABN,
        _id: { $ne: organisationId }
      });

      if (existingOrg) {
        return NextResponse.json(
          { error: 'An organisation with this ABN already exists' },
          { status: 400 }
        );
      }
    }

    // Update organisation
    const orgUpdateResult = await db.collection('organisations').updateOne(
      { _id: organisationId as any },
      {
        $set: {
          company_name: sanitizedData.companyName,
          trading_name: sanitizedData.tradingName || null,
          abn: cleanABN,
          address: sanitizedData.companyAddress,
          entity_type: sanitizedData.entity,
          industry_type: sanitizedData.industryType,
          phone: sanitizedData.contactPhone
        }
      }
    );

    if (orgUpdateResult.matchedCount === 0) {
      console.error('Error updating organisation: not found');
      return NextResponse.json(
        { error: 'Failed to update organisation' },
        { status: 500 }
      );
    }

    // Update user profile
    const userUpdateResult = await db.collection('users').updateOne(
      { _id: id as any },
      {
        $set: {
          email: sanitizedData.contactEmail,
          first_name: sanitizedData.directorFirstName,
          surname: sanitizedData.directorSurname,
          phone: sanitizedData.contactPhone
        }
      }
    );

    if (userUpdateResult.matchedCount === 0) {
      console.error('Error updating user profile: not found');
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }

    // Update primary director
    await db.collection('organisation_directors').updateOne(
      { organisation_id: organisationId, is_primary: true },
      {
        $set: {
          first_name: sanitizedData.directorFirstName,
          surname: sanitizedData.directorSurname,
          email: sanitizedData.contactEmail,
          phone: sanitizedData.contactPhone
        }
      }
    );

    // Handle additional directors
    // Get current directors (excluding primary)
    const currentDirectors = await db.collection('organisation_directors')
      .find({ organisation_id: organisationId, is_primary: false })
      .toArray();

    // Update or create additional directors
    for (const director of sanitizedData.additionalDirectors) {
      if (director.id) {
        // Update existing director
        await db.collection('organisation_directors').updateOne(
          { _id: director.id as any },
          {
            $set: {
              first_name: director.firstName,
              surname: director.surname,
              email: director.email || null,
              phone: director.phone || null
            }
          }
        );
      } else {
        // Create new director
        await db.collection('organisation_directors').insertOne({
          _id: uuidv4() as any,
          organisation_id: organisationId,
          first_name: director.firstName,
          surname: director.surname,
          email: director.email || null,
          phone: director.phone || null,
          is_primary: false,
          created_at: new Date().toISOString()
        });
      }
    }

    // Delete directors that were removed
    const keptDirectorIds = sanitizedData.additionalDirectors
      .filter(d => d.id)
      .map(d => d.id);

    if (currentDirectors) {
      const directorsToDelete = currentDirectors
        .filter(d => !keptDirectorIds.includes(String(d._id)))
        .map(d => d._id);

      if (directorsToDelete.length > 0) {
        await db.collection('organisation_directors').deleteMany({
          _id: { $in: directorsToDelete as any }
        });
      }
    }

    // Log the update
    try {
      await createAuditLog({
        user_id: user.userId,
        table_name: 'organisations',
        record_id: organisationId,
        action: 'update',
        field_name: 'admin_updated',
        old_value: null,
        new_value: `Organisation updated by admin: ${sanitizedData.companyName}`,
        description: null,
        ip_address: ip,
        user_agent: headersList.get('user-agent') || 'unknown',
        created_at: new Date().toISOString()
      });
    } catch (auditError) {
      console.error('Error logging update:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Referrer updated successfully'
    });

  } catch (error) {
    console.error('Update referrer error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
