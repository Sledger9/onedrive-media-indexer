import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await ensureDbInitialized();
    const result = await db.execute({
      sql: 'SELECT direct_link FROM media_items WHERE id = ?',
      args: [id],
    });

    if (result.rows.length === 0) {
      return new NextResponse('Item not found', { status: 404 });
    }

    const row = result.rows[0];
    const directLink = row.direct_link as string;

    if (!directLink) {
      return new NextResponse('Direct download link not synced yet. Please sync your library using the local worker.', { status: 400 });
    }

    return NextResponse.redirect(directLink);
  } catch (error: any) {
    console.error('[API_DOWNLOAD] Failed to redirect download:', error.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
