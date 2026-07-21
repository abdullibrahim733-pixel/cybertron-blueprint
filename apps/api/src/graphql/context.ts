import { getDb } from '../db/pool.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export interface GraphQLContext {
  userId: string | null;
  user: any | null;
}

export async function getContext(req: any): Promise<GraphQLContext> {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return { userId: null, user: null };
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId);
    
    if (!user) {
      return { userId: null, user: null };
    }

    const row = user as any;
    return {
      userId: row.id,
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        avatarUrl: row.avatar_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    };
  } catch {
    return { userId: null, user: null };
  }
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}
