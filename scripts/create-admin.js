const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Load environment variables if they exist
require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '.env' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function prompt(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n=== OneDrive Media Indexer Admin Setup ===\n');

  const username = await prompt('Enter desired username (e.g., admin): ');
  if (!username) {
    console.error('Username cannot be empty.');
    process.exit(1);
  }

  const password = await prompt('Enter secure password: ');
  if (!password) {
    console.error('Password cannot be empty.');
    process.exit(1);
  }

  const dbUrl = process.env.TURSO_DATABASE_URL || 'file:local.db';
  const dbAuthToken = process.env.TURSO_AUTH_TOKEN || '';

  console.log(`\nConnecting to database: ${dbUrl}`);

  try {
    const db = createClient({
      url: dbUrl,
      authToken: dbAuthToken,
    });

    // Ensure the users table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY, 
        password_hash TEXT, 
        failed_attempts INTEGER DEFAULT 0, 
        locked_until TEXT
      )
    `);

    // Hash the password with bcrypt (salt rounds = 12 for high security)
    console.log('Hashing password (this may take a second)...');
    const hash = await bcrypt.hash(password, 12);

    // Insert or update the user in the database
    await db.execute({
      sql: `INSERT INTO users (username, password_hash, failed_attempts, locked_until) 
            VALUES (?, ?, 0, NULL) 
            ON CONFLICT(username) DO UPDATE SET 
              password_hash = excluded.password_hash,
              failed_attempts = 0,
              locked_until = NULL`,
      args: [username, hash]
    });

    console.log(`\n✅ Success! User '${username}' has been created/updated.`);
    console.log('You can now log into your dashboard using these credentials.\n');
  } catch (err) {
    console.error('\n❌ Database error:', err.message);
  } finally {
    rl.close();
  }
}

main();
