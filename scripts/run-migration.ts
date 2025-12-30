import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const DATABASE_URL = `postgresql://postgres.ytjbxekcmcbouyohydyl:${process.env.SUPABASE_SERVICE_ROLE_KEY}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`;

async function runMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    const migrationSQL = fs.readFileSync(
      path.join(process.cwd(), 'scripts', 'migration.sql'),
      'utf-8'
    );

    console.log('Running migration...');
    await client.query(migrationSQL);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration();
