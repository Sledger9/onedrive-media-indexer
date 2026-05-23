import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get('id'); // null or empty means root
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  try {
    await ensureDbInitialized();
    let query = '';
    let args: any[] = [];

    if (!parentId || parentId === 'root' || parentId === 'null') {
      query = `SELECT * FROM media_items 
               WHERE parent_id = 'root' 
                  OR parent_id IS NULL
                  OR parent_id = (SELECT id FROM media_items WHERE (parent_id = 'root' OR parent_id IS NULL) AND is_directory = 1 LIMIT 1)
               ORDER BY is_directory DESC, name ASC LIMIT ? OFFSET ?`;
      args = [limit, offset];
    } else {
      query = 'SELECT * FROM media_items WHERE parent_id = ? ORDER BY is_directory DESC, name ASC LIMIT ? OFFSET ?';
      args = [parentId, limit, offset];
    }

    const result = await db.execute({ sql: query, args });
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
      audioTracks: row.audio_tracks ? JSON.parse(row.audio_tracks) : null,
      subtitleTracks: row.subtitle_tracks ? JSON.parse(row.subtitle_tracks) : null,
    }));

    // Generate breadcrumbs if we are inside a subdirectory
    let breadcrumbs: Array<{ id: string; name: string }> = [];
    if (parentId && parentId !== 'root' && parentId !== 'null') {
      const folderResult = await db.execute({
        sql: 'SELECT name, path FROM media_items WHERE id = ?',
        args: [parentId],
      });

      if (folderResult.rows.length > 0) {
        const folder = folderResult.rows[0];
        const pathParts = (folder.path as string).split('/');
        
        let runningPath = '';
        breadcrumbs = await Promise.all(
          pathParts.map(async (part) => {
            runningPath = runningPath ? `${runningPath}/${part}` : part;
            // Generate deterministic ID
            const crypto = require('crypto');
            const partId = crypto.createHash('sha256').update(runningPath).digest('hex').substring(0, 16);
            return {
              id: partId,
              name: part,
            };
          })
        );
      }
    }

    return NextResponse.json({ items, breadcrumbs });
  } catch (error) {
    console.error('[API_FOLDERS] Failed to fetch folder contents:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
