const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

async function checkDb(name, filePath) {
  console.log(`Checking ${name} at: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.log(`  File does not exist!`);
    return;
  }
  console.log(`  File exists, size: ${fs.statSync(filePath).size} bytes`);
  
  const db = createClient({ url: 'file:' + filePath });
  try {
    const tableCheck = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='media_items'");
    if (tableCheck.rows.length === 0) {
      console.log(`  Table 'media_items' does not exist in this database.`);
      return;
    }
    
    const countResult = await db.execute('SELECT COUNT(*) as count FROM media_items');
    console.log(`  Total items in 'media_items' table: ${countResult.rows[0].count}`);
    
    const sample = await db.execute('SELECT id, name, path FROM media_items LIMIT 3');
    console.log(`  Sample items:`, sample.rows);
  } catch (err) {
    console.error(`  Error: ${err.message}`);
  }
}

async function run() {
  const rootPath = path.join(__dirname, '../local.db');
  const workerPath = path.join(__dirname, '../worker/local.db');
  
  await checkDb('Root Database', rootPath);
  console.log('\n----------------------------------------\n');
  await checkDb('Worker Database', workerPath);
}

run();
