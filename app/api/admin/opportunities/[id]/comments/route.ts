import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { v4 as uuidv4 } from 'uuid';

// GET - Fetch all comments for an opportunity
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

    if (user.role !== 'super_admin' && user.role !== 'admin_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDatabase();

    // Fetch comments with user info
    const comments = await db.collection(COLLECTIONS.COMMENTS)
      .aggregate([
        { $match: { opportunity_id: id, deleted_at: null } },
        {
          $lookup: {
            from: COLLECTIONS.USERS,
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $sort: { created_at: -1 } }
      ])
      .toArray();

    const formattedComments = comments.map((comment: any) => ({
      id: comment._id,
      content: comment.content,
      created_at: comment.created_at,
      user_name: comment.user
        ? `${comment.user.first_name || ''} ${comment.user.surname || ''}`.trim() || comment.user.email
        : 'Unknown User',
      user_id: comment.user_id,
    }));

    return NextResponse.json({ comments: formattedComments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new comment
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

    if (user.role !== 'super_admin' && user.role !== 'admin_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Verify opportunity exists
    const opportunity = await db.collection(COLLECTIONS.OPPORTUNITIES).findOne({
      _id: id as any,
      deleted_at: null
    });

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    const comment = {
      _id: uuidv4(),
      opportunity_id: id,
      user_id: user.userId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    await db.collection(COLLECTIONS.COMMENTS).insertOne(comment as any);

    // Get user info for response
    const userInfo = await db.collection(COLLECTIONS.USERS).findOne({ _id: user.userId as any });

    return NextResponse.json({
      success: true,
      comment: {
        id: comment._id,
        content: comment.content,
        created_at: comment.created_at,
        user_name: userInfo
          ? `${userInfo.first_name || ''} ${userInfo.surname || ''}`.trim() || userInfo.email
          : 'Unknown User',
        user_id: comment.user_id,
      }
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
