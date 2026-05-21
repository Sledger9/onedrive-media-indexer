import { createClient, Client } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

// Initialize the LibSQL Client (supports both SQLite files and Turso cloud)
export const db: Client = createClient({
  url,
  authToken,
});

/**
 * Initializes the database schema.
 * Creates media_items and user_states tables if they do not exist.
 */
export async function initDb(): Promise<void> {
  // Ensure we don't cause locking issues on local files by logging cleanly
  try {
    // 1. Create Media Items Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS media_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        parent_id TEXT,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        modified_at TEXT NOT NULL,
        is_directory BOOLEAN NOT NULL DEFAULT 0,
        duration REAL,
        resolution TEXT,
        video_codec TEXT,
        audio_tracks TEXT, -- JSON string array
        subtitle_tracks TEXT, -- JSON string array
        direct_link TEXT, -- OneDrive public direct link
        indexed_at TEXT NOT NULL
      );
    `);

    // Alter table to add direct_link if it doesn't exist (self-healing for migrations)
    try {
      await db.execute(`ALTER TABLE media_items ADD COLUMN direct_link TEXT;`);
      console.log('[DB] Successfully added direct_link column to media_items.');
    } catch (e: any) {
      // Column might already exist, which is expected
      if (!e.message.includes('duplicate column name') && !e.message.includes('already exists')) {
        console.warn('[DB] Failed to add direct_link column (may already exist):', e.message);
      }
    }

    // Create indices for fast lookup
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_media_parent ON media_items(parent_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_media_path ON media_items(path);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_media_isdir ON media_items(is_directory);`);

    // 2. Create User States Table for favorites and watch history
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        media_id TEXT NOT NULL,
        playback_position REAL DEFAULT 0,
        is_favorite BOOLEAN DEFAULT 0,
        watched_at TEXT,
        FOREIGN KEY(media_id) REFERENCES media_items(id) ON DELETE CASCADE
      );
    `);

    // Create unique constraint index
    await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_media ON user_states(user_id, media_id);`);
  } catch (error) {
    console.error('[DB] Failed to initialize database tables:', error);
    throw error;
  }
}

let initPromise: Promise<void> | null = null;

/**
 * Ensures the database schema is initialized and returns when ready.
 * Prevents race conditions where queries execute before tables are created.
 */
export async function ensureDbInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = initDb();
  }
  return initPromise;
}

// Self-healing: Automatically trigger database tables initialization on import
ensureDbInitialized()
  .then(() => console.log(`[DB] Database self-healing check complete at: ${url}`))
  .catch((err) => console.error('[DB] Database automatic startup init failed:', err));

