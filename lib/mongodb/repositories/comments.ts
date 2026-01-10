import { getDatabase } from '../client';
import { ObjectId } from 'mongodb';

export interface Comment {
  _id: string;
  opportunity_id: string;
  user_id: string;
  comment: string;
  is_public: boolean;
  created_at: string;
}

export async function findCommentById(id: string): Promise<Comment | null> {
  const db = await getDatabase();
  return db.collection<Comment>('comments').findOne({ _id: id as any });
}

export async function findCommentsByOpportunity(opportunityId: string, options?: {
  is_public?: boolean;
}): Promise<Comment[]> {
  const db = await getDatabase();
  const query: Record<string, unknown> = { opportunity_id: opportunityId };
  if (options?.is_public !== undefined) query.is_public = options.is_public;

  return db.collection<Comment>('comments')
    .find(query)
    .sort({ created_at: -1 })
    .toArray();
}

export async function findCommentsWithUsers(opportunityId: string): Promise<Array<Comment & { user?: { first_name: string; surname: string } }>> {
  const db = await getDatabase();

  return db.collection('comments').aggregate([
    { $match: { opportunity_id: opportunityId } },
    {
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user_array'
      }
    },
    {
      $addFields: {
        user: { $arrayElemAt: ['$user_array', 0] }
      }
    },
    { $unset: 'user_array' },
    {
      $project: {
        _id: 1,
        opportunity_id: 1,
        user_id: 1,
        comment: 1,
        is_public: 1,
        created_at: 1,
        'user.first_name': 1,
        'user.surname': 1
      }
    },
    { $sort: { created_at: -1 } }
  ]).toArray() as Promise<Array<Comment & { user?: { first_name: string; surname: string } }>>;
}

export async function createComment(data: Omit<Comment, '_id'>): Promise<Comment> {
  const db = await getDatabase();
  const id = new ObjectId().toString();
  const comment: Comment = { _id: id, ...data };
  await db.collection<Comment>('comments').insertOne(comment);
  return comment;
}

export async function updateComment(id: string, data: Partial<Comment>): Promise<Comment | null> {
  const db = await getDatabase();
  return db.collection<Comment>('comments').findOneAndUpdate(
    { _id: id as any },
    { $set: data },
    { returnDocument: 'after' }
  );
}

export async function deleteComment(id: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.collection('comments').deleteOne({ _id: id as any });
  return result.deletedCount > 0;
}

export async function countComments(opportunityId: string): Promise<number> {
  const db = await getDatabase();
  return db.collection('comments').countDocuments({ opportunity_id: opportunityId });
}
