import { NextRequest, NextResponse } from 'next/server';
import { getDriveItems, OneDriveItem } from '@/lib/onedrive';
import { db } from '@/lib/db';
import crypto from 'crypto';

let isScanning = false;
let scanStatus = 'idle';
let scannedItems = 0;

export async function GET(req: NextRequest) {
  return NextResponse.json({ status: scanStatus, isScanning, scannedItems });
}

export async function POST(req: NextRequest) {
  if (isScanning) {
    return NextResponse.json({ error: 'Scan is already running' }, { status: 429 });
  }

  isScanning = true;
  scanStatus = 'scanning';
  scannedItems = 0;

  // Run scan asynchronously so the request doesn't timeout
  runScan().catch(err => {
    console.error('[SCAN] Fatal error:', err);
    scanStatus = 'error: ' + err.message;
    isScanning = false;
  });

  return NextResponse.json({ message: 'Scan started' });
}

async function runScan() {
  const rootItems = await getDriveItems('root');
  
  // Find the 'Uploads' or root media folder (or just scan everything)
  await processFolder('root', 'root');
  
  scanStatus = 'completed';
  isScanning = false;
}

async function processFolder(folderId: string, parentPath: string) {
  const items = await getDriveItems(folderId);
  
  for (const item of items) {
    if (item.folder) {
      // It's a folder, recursively scan
      const currentPath = parentPath === 'root' ? item.name : `${parentPath}/${item.name}`;
      
      // Upsert folder
      await db.execute({
        sql: `INSERT INTO media_items (id, parent_id, name, path, is_directory, size) 
              VALUES (?, ?, ?, ?, 1, 0) 
              ON CONFLICT(id) DO UPDATE SET name = excluded.name, path = excluded.path`,
        args: [item.id, folderId, item.name, currentPath],
      });
      
      // We could add a delay here to avoid Graph API rate limits
      await new Promise(res => setTimeout(res, 500));
      await processFolder(item.id, currentPath);
    } else if (item.file && item.name.match(/\.(mp4|mkv|avi|mov)$/i)) {
      // It's a video file
      scannedItems++;
      const currentPath = parentPath === 'root' ? item.name : `${parentPath}/${item.name}`;
      
      // Upsert file
      await db.execute({
        sql: `INSERT INTO media_items (id, parent_id, name, path, is_directory, size, mime_type, updated_at) 
              VALUES (?, ?, ?, ?, 0, ?, ?, CURRENT_TIMESTAMP) 
              ON CONFLICT(id) DO UPDATE SET 
                name = excluded.name, 
                path = excluded.path,
                size = excluded.size,
                updated_at = CURRENT_TIMESTAMP`,
        args: [item.id, folderId, item.name, currentPath, item.size || 0, item.file.mimeType],
      });
    }
  }
}
