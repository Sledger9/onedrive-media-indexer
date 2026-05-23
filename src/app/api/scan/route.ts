import { NextRequest, NextResponse } from 'next/server';
import { getAllDriveItems } from '@/lib/onedrive';
import { db } from '@/lib/db';

let isScanning = false;
let scanStatus = 'idle';
let processedItems = 0;
let totalItems = 0;

export async function GET(req: NextRequest) {
  return NextResponse.json({ status: scanStatus, isScanning, processedItems, totalItems });
}

export async function POST(req: NextRequest) {
  if (isScanning) {
    return NextResponse.json({ error: 'Scan is already running' }, { status: 429 });
  }

  isScanning = true;
  scanStatus = 'fetching';
  processedItems = 0;
  totalItems = 0;

  // Run scan asynchronously so the request doesn't timeout
  runScan().catch(err => {
    console.error('[SCAN] Fatal error:', err);
    scanStatus = 'error: ' + err.message;
    isScanning = false;
  });

  return NextResponse.json({ message: 'Scan started' });
}

async function runScan() {
  try {
    const allItems = await getAllDriveItems();
    totalItems = allItems.length;
    scanStatus = 'saving to database';
    
    // Map item IDs to their names so we can build paths (OneDrive delta gives flat list)
    const idToName: Record<string, string> = {};
    const idToParent: Record<string, string> = {};
    
    for (const item of allItems) {
      idToName[item.id] = item.name;
      if (item.parentReference?.id) {
        idToParent[item.id] = item.parentReference.id;
      }
    }
    
    // Helper to build path
    const getPath = (id: string): string => {
      let currentId = id;
      let pathSegments: string[] = [];
      while (currentId && idToName[currentId]) {
        pathSegments.unshift(idToName[currentId]);
        currentId = idToParent[currentId];
      }
      return pathSegments.join('/') || idToName[id] || 'root';
    };

    // Insert all items in batches
    for (const item of allItems) {
      processedItems++; // Increment progress bar

      if (item.deleted) {
        // Handle deleted items if this is an incremental sync
        await db.execute({ sql: `DELETE FROM media_items WHERE id = ?`, args: [item.id] });
        continue;
      }

      const currentPath = getPath(item.id);
      const parentId = item.parentReference?.id || 'root';

      if (item.folder) {
        await db.execute({
          sql: `INSERT INTO media_items (id, parent_id, name, path, is_directory, size) 
                VALUES (?, ?, ?, ?, 1, 0) 
                ON CONFLICT(id) DO UPDATE SET name = excluded.name, path = excluded.path`,
          args: [item.id, parentId, item.name, currentPath],
        });
      } else if (item.file && item.name.match(/\.(mp4|mkv|avi|mov)$/i)) {
        await db.execute({
          sql: `INSERT INTO media_items (id, parent_id, name, path, is_directory, size, mime_type, updated_at) 
                VALUES (?, ?, ?, ?, 0, ?, ?, CURRENT_TIMESTAMP) 
                ON CONFLICT(id) DO UPDATE SET 
                  name = excluded.name, 
                  path = excluded.path,
                  size = excluded.size,
                  updated_at = CURRENT_TIMESTAMP`,
          args: [item.id, parentId, item.name, currentPath, item.size || 0, item.file.mimeType],
        });
      }
    }
    
    scanStatus = 'completed';
    isScanning = false;
  } catch (error: any) {
    console.error('[SCAN] Error in runScan:', error);
    scanStatus = 'error: ' + error.message;
    isScanning = false;
  }
}
