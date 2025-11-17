import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

async function checkAndSetup() {
  if (!DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set, skipping auto-setup');
    return;
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : undefined
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'crops'
      );
    `);

    if (result.rows[0].exists) {
      console.log('✅ Database already initialized, skipping setup');
      return;
    }

    console.log('📊 Database not initialized, running setup...');

    const migrationPath = path.join(__dirname, '..', 'migrations', '001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    await client.query(migrationSQL);
    console.log('✅ Migrations completed');

    const excelPath = path.join(__dirname, '..', '..', '[Digital Green] Maize Decision Trees.xlsx');
    if (fs.existsSync(excelPath)) {
      console.log('📥 Importing Excel data...');
      const { importExcel } = await import('./import-excel.ts');
      await importExcel();
      console.log('✅ Excel data imported');
    } else {
      console.log('⚠️  Excel file not found, skipping import');
    }

  } catch (error: any) {
    console.error('❌ Setup error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkAndSetup().catch(console.error);
}

