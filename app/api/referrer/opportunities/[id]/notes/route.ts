import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a referrer
    if (user.role !== 'referrer_admin' && user.role !== 'referrer_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!user.organisationId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const db = await getDatabase();

    // Verify opportunity belongs to this organization
    const opportunity = await db.collection(COLLECTIONS.OPPORTUNITIES).findOne({
      _id: id as any,
      organization_id: user.organisationId,
    });

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // Fetch notes
    const notes = await db.collection(COLLECTIONS.COMMENTS)
      .find({ opportunity_id: id })
      .sort({ created_at: -1 })
      .toArray();

    // Get unique user IDs and fetch user details
    const userIds = [...new Set(notes.map((n: any) => n.user_id).filter(Boolean))];
    const userMap: Record<string, { first_name: string; surname: string }> = {};

    if (userIds.length > 0) {
      const users = await db.collection(COLLECTIONS.USERS)
        .find({ _id: { $in: userIds } })
        .project({ _id: 1, first_name: 1, surname: 1 })
        .toArray();

      users.forEach((u: any) => {
        userMap[u._id] = { first_name: u.first_name, surname: u.surname };
      });
    }

    const formattedNotes = notes.map((note: any) => {
      const noteUser = userMap[note.user_id];
      return {
        id: note._id,
        content: note.comment,
        created_at: note.created_at,
        created_by: note.user_id,
        created_by_name: noteUser ? `${noteUser.first_name} ${noteUser.surname}` : 'Unknown',
        is_public: note.is_public,
      };
    });

    return NextResponse.json(formattedNotes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a referrer
    if (user.role !== 'referrer_admin' && user.role !== 'referrer_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!user.organisationId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const db = await getDatabase();

    // Verify opportunity belongs to this organization
    const opportunity = await db.collection(COLLECTIONS.OPPORTUNITIES).findOne({
      _id: id as any,
      organization_id: user.organisationId,
    });

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    // Create note
    const noteId = new ObjectId().toString();
    const noteData = {
      _id: noteId,
      opportunity_id: id,
      comment: content.trim(),
      user_id: user.userId,
      is_public: true,
      created_at: new Date().toISOString(),
    };

    const result = await db.collection(COLLECTIONS.COMMENTS).insertOne(noteData as any);

    console.log('Note insert result:', {
      opportunityId: id,
      insertedId: result.insertedId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
