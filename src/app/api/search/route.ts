import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || query.trim() === '') {
    return NextResponse.json({ items: [] });
  }

  try {
    await ensureDbInitialized();
    const searchPattern = `%${query.trim()}%`;
    const result = await db.execute({
      sql: 'SELECT * FROM media_items WHERE name LIKE ? ORDER BY is_directory DESC, name ASC LIMIT 50',
      args: [searchPattern],
    });

    const items = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      path: row.path,
      parentId: row.parent_id,
      mimeType: row.mime_type,
      size: row.size,
      modifiedAt: row.modified_at,
      isDirectory: row.is_directory === 1 || row.is_directory === true,
      duration: row.duration,
      resolution: row.resolution,
      videoCodec: row.video_codec,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[API_SEARCH] Failed to execute search query:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
