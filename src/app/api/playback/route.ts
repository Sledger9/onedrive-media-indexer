import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'continue'; // 'continue' or 'favorites'
  const userId = 'admin'; // Single user admin portal

  try {
    await ensureDbInitialized();
    let result;
    if (type === 'favorites') {
      result = await db.execute({
        sql: `
          SELECT m.*, u.playback_position, u.is_favorite 
          FROM media_items m
          JOIN user_states u ON m.id = u.media_id
          WHERE u.user_id = ? AND u.is_favorite = 1
          ORDER BY m.name ASC
        `,
        args: [userId],
      });
    } else {
      // Default: continue watching (recently played with position > 0)
      result = await db.execute({
        sql: `
          SELECT m.*, u.playback_position, u.is_favorite, u.watched_at
          FROM media_items m
          JOIN user_states u ON m.id = u.media_id
          WHERE u.user_id = ? AND u.playback_position > 0
          ORDER BY u.watched_at DESC
          LIMIT 12
        `,
        args: [userId],
      });
    }

    const items = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      path: row.path,
      parentId: row.parent_id,
      mimeType: row.mime_type,
      size: row.size,
      modifiedAt: row.modified_at,
      isDirectory: row.is_directory === 1,
      duration: row.duration,
      resolution: row.resolution,
      videoCodec: row.video_codec,
      playbackPosition: row.playback_position,
      isFavorite: row.is_favorite === 1,
      watchedAt: row.watched_at,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[API_PLAYBACK] Failed to fetch user playback states:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = 'admin';

  try {
    await ensureDbInitialized();
    const { mediaId, playbackPosition, isFavorite } = await req.json();

    if (!mediaId) {
      return NextResponse.json({ error: 'Missing mediaId' }, { status: 400 });
    }

    const nowStr = new Date().toISOString();

    // Check if user state exists
    const existing = await db.execute({
      sql: 'SELECT id, playback_position, is_favorite FROM user_states WHERE user_id = ? AND media_id = ?',
      args: [userId, mediaId],
    });

    if (existing.rows.length > 0) {
      // Update
      const row = existing.rows[0];
      const newPosition = playbackPosition !== undefined ? playbackPosition : row.playback_position;
      const newFavorite = isFavorite !== undefined ? (isFavorite ? 1 : 0) : row.is_favorite;

      await db.execute({
        sql: `
          UPDATE user_states 
          SET playback_position = ?, is_favorite = ?, watched_at = ?
          WHERE user_id = ? AND media_id = ?
        `,
        args: [newPosition, newFavorite, nowStr, userId, mediaId],
      });
    } else {
      // Insert
      const pos = playbackPosition !== undefined ? playbackPosition : 0;
      const fav = isFavorite !== undefined ? (isFavorite ? 1 : 0) : 0;

      await db.execute({
        sql: `
          INSERT INTO user_states (user_id, media_id, playback_position, is_favorite, watched_at)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [userId, mediaId, pos, fav, nowStr],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API_PLAYBACK] Failed to update playback state:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
