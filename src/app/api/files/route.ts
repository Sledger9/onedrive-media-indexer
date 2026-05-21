import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing file id parameter' }, { status: 400 });
  }

  try {
    await ensureDbInitialized();
    const result = await db.execute({
      sql: 'SELECT * FROM media_items WHERE id = ? AND is_directory = 0',
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const row = result.rows[0];
    const file = {
      id: row.id,
      name: row.name,
      path: row.path,
      parentId: row.parent_id,
      mimeType: row.mime_type,
      size: row.size,
      modifiedAt: row.modified_at,
      duration: row.duration,
      resolution: row.resolution,
      videoCodec: row.video_codec,
      audioTracks: row.audio_tracks ? JSON.parse(row.audio_tracks as string) : [],
      subtitleTracks: row.subtitle_tracks ? JSON.parse(row.subtitle_tracks as string) : [],
      indexedAt: row.indexed_at,
    };

    return NextResponse.json(file);
  } catch (error) {
    console.error('[API_FILES] Failed to fetch file details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
