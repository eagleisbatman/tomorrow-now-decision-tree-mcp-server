import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

export interface DecisionRule {
  id: string;
  parameter: string;
  condition_type: string;
  units: string;
  range_min: string;
  range_max: string | null;
  message_english: string;
}

export interface GrowthStage {
  id: string;
  stage_name: string;
  stage_order: number;
}

export interface Crop {
  id: string;
  name: string;
  display_name: string;
  base_temp_celsius: number;
  cap_temp_celsius: number;
}

