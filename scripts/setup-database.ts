import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

async function runMigrations() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : undefined
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const migrationPath = path.join(__dirname, '..', 'migrations', '001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📊 Running migrations...');
    await client.query(migrationSQL);
    console.log('✅ Migrations completed successfully');
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('⚠️  Tables already exist, skipping migration');
    } else {
      console.error('❌ Migration error:', error.message);
      throw error;
    }
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🚀 Setting up database...\n');
  
  try {
    await runMigrations();
    console.log('\n✅ Database setup complete!');
    console.log('\n📝 Next step: Run "npm run import" to import Excel data');
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);

