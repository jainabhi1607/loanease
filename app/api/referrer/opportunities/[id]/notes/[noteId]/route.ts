import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id, noteId } = await params;
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

    // Verify note exists and belongs to this opportunity
    const note = await db.collection(COLLECTIONS.COMMENTS).findOne({
      _id: noteId as any,
      opportunity_id: id,
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Check if user is the creator or is referrer_admin
    if (note.user_id !== user.userId && user.role !== 'referrer_admin') {
      return NextResponse.json({ error: 'You can only edit your own notes' }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    // Update note
    const result = await db.collection(COLLECTIONS.COMMENTS).updateOne(
      { _id: noteId as any },
      { $set: { comment: content.trim() } }
    );

    if (result.matchedCount === 0) {
      console.error('Error updating note: No document matched');
      return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id, noteId } = await params;
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

    // Verify note exists and belongs to this opportunity
    const note = await db.collection(COLLECTIONS.COMMENTS).findOne({
      _id: noteId as any,
      opportunity_id: id,
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Check if user is the creator or is referrer_admin
    if (note.user_id !== user.userId && user.role !== 'referrer_admin') {
      return NextResponse.json({ error: 'You can only delete your own notes' }, { status: 403 });
    }

    // Hard delete note
    const result = await db.collection(COLLECTIONS.COMMENTS).deleteOne({ _id: noteId as any });

    if (result.deletedCount === 0) {
      console.error('Error deleting note: No document deleted');
      return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
