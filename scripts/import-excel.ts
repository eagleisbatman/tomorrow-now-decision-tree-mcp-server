import 'dotenv/config';
import XLSX from 'xlsx';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

interface GDDRow {
  growthStage: string;
  early: number;
  mid: number;
  late: number;
}

interface DecisionTreeRow {
  crop: string;
  parameter: string;
  growthStage: string;
  growthStageOrder: number;
  condition: string;
  units: string;
  rangeMin: string;
  rangeMax: string | null;
  messageEnglish: string;
  messageLength: number;
}

async function importExcel() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const excelPath = path.join(__dirname, '..', '..', '[Digital Green] Maize Decision Trees.xlsx');
    const workbook = XLSX.readFile(excelPath);
    
    console.log('📊 Sheets:', workbook.SheetNames);

    // Import GDD data
    const gddSheet = workbook.Sheets['1. Growing Degree Days (GDDs)'];
    const gddData = XLSX.utils.sheet_to_json(gddSheet, { header: 1, defval: null });
    
    // Parse GDD data
    const gddRows: GDDRow[] = [];
    let baseTemp = 10;
    let capTemp = 30;
    
    for (let i = 3; i < gddData.length; i++) {
      const row = gddData[i] as any[];
      if (!row || row.length < 6) continue;
      
      if (row[1] === 'Base Temp (0C)') {
        baseTemp = parseFloat(row[2]) || 10;
        capTemp = parseFloat(row[4]) || 30;
        continue;
      }
      
      if (typeof row[0] === 'number' && row[1]) {
        gddRows.push({
          growthStage: row[1],
          early: parseFloat(row[2]) || 0,
          mid: parseFloat(row[3]) || 0,
          late: parseFloat(row[4]) || 0
        });
      }
    }

    console.log(`📈 Found ${gddRows.length} GDD rows`);
    console.log(`🌡️  Base Temp: ${baseTemp}°C, Cap Temp: ${capTemp}°C`);

    // Import Decision Trees
    const dtSheet = workbook.Sheets['2. Decision Trees'];
    const dtData = XLSX.utils.sheet_to_json(dtSheet, { header: 1, defval: null });
    
    const dtRows: DecisionTreeRow[] = [];
    for (let i = 1; i < dtData.length; i++) {
      const row = dtData[i] as any[];
      if (!row || !row[0]) continue;
      
      dtRows.push({
        crop: row[0],
        parameter: row[1],
        growthStage: row[2],
        growthStageOrder: parseInt(row[3]) || 0,
        condition: row[4],
        units: row[5],
        rangeMin: row[6] || '',
        rangeMax: row[7] || null,
        messageEnglish: row[8] || '',
        messageLength: parseInt(row[9]) || 0
      });
    }

    console.log(`🌳 Found ${dtRows.length} decision tree rules`);

    // Get unique crops
    const crops = [...new Set(dtRows.map(r => r.crop.split('_')[0]))];
    console.log(`🌾 Crops: ${crops.join(', ')}`);

    // Insert crops
    for (const cropName of crops) {
      const result = await client.query(
        `INSERT INTO crops (name, display_name, base_temp_celsius, cap_temp_celsius)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO UPDATE SET
           base_temp_celsius = EXCLUDED.base_temp_celsius,
           cap_temp_celsius = EXCLUDED.cap_temp_celsius
         RETURNING id`,
        [cropName.toLowerCase(), cropName, baseTemp, capTemp]
      );
      console.log(`✅ Inserted/Updated crop: ${cropName}`);
    }

    // Insert growth stages
    const growthStages = [...new Set(dtRows.map(r => ({ name: r.growthStage, order: r.growthStageOrder })))];
    
    for (const cropName of crops) {
      const cropResult = await client.query('SELECT id FROM crops WHERE name = $1', [cropName.toLowerCase()]);
      const cropId = cropResult.rows[0].id;

      for (const stage of growthStages) {
        const gddRow = gddRows.find(g => g.growthStage === stage.name);
        
        await client.query(
          `INSERT INTO growth_stages (crop_id, stage_name, stage_order, gdd_early_min, gdd_early_max, gdd_mid_min, gdd_mid_max, gdd_late_min, gdd_late_max)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (crop_id, stage_order) DO UPDATE SET
             stage_name = EXCLUDED.stage_name,
             gdd_early_min = EXCLUDED.gdd_early_min,
             gdd_early_max = EXCLUDED.gdd_early_max,
             gdd_mid_min = EXCLUDED.gdd_mid_min,
             gdd_mid_max = EXCLUDED.gdd_mid_max,
             gdd_late_min = EXCLUDED.gdd_late_min,
             gdd_late_max = EXCLUDED.gdd_late_max`,
          [
            cropId,
            stage.name,
            stage.order,
            gddRow?.early || null,
            null,
            gddRow?.mid || null,
            null,
            gddRow?.late || null,
            null
          ]
        );
      }
      console.log(`✅ Inserted growth stages for ${cropName}`);
    }

    // Insert decision tree rules
    for (const row of dtRows) {
      const cropName = row.crop.split('_')[0];
      const varietyType = row.crop.split('_')[1] || 'Early';
      
      const cropResult = await client.query('SELECT id FROM crops WHERE name = $1', [cropName.toLowerCase()]);
      const cropId = cropResult.rows[0].id;
      
      const stageResult = await client.query(
        'SELECT id FROM growth_stages WHERE crop_id = $1 AND stage_order = $2',
        [cropId, row.growthStageOrder]
      );
      const stageId = stageResult.rows[0].id;

      await client.query(
        `INSERT INTO decision_tree_rules 
         (crop_id, growth_stage_id, parameter, condition_type, units, range_min, range_max, message_english, message_length)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING`,
        [
          cropId,
          stageId,
          row.parameter,
          row.condition,
          row.units,
          row.rangeMin,
          row.rangeMax,
          row.messageEnglish,
          row.messageLength
        ]
      );
    }
    console.log(`✅ Inserted ${dtRows.length} decision tree rules`);

    // Insert GDD configs
    for (const cropName of crops) {
      const cropResult = await client.query('SELECT id FROM crops WHERE name = $1', [cropName.toLowerCase()]);
      const cropId = cropResult.rows[0].id;

      for (const gddRow of gddRows) {
        const stageResult = await client.query(
          'SELECT id FROM growth_stages WHERE crop_id = $1 AND stage_name = $2',
          [cropId, gddRow.growthStage]
        );
        if (stageResult.rows.length === 0) continue;
        const stageId = stageResult.rows[0].id;

        for (const varietyType of ['Early', 'Mid', 'Late']) {
          const gddValue = varietyType === 'Early' ? gddRow.early : varietyType === 'Mid' ? gddRow.mid : gddRow.late;
          if (gddValue > 0) {
            await client.query(
              `INSERT INTO gdd_configs (crop_id, variety_type, growth_stage_id, gdd_min, gdd_max)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (crop_id, variety_type, growth_stage_id) DO UPDATE SET
                 gdd_min = EXCLUDED.gdd_min,
                 gdd_max = EXCLUDED.gdd_max`,
              [cropId, varietyType, stageId, gddValue, gddValue + 50]
            );
          }
        }
      }
    }
    console.log(`✅ Inserted GDD configurations`);

    console.log('\n✅ Import completed successfully!');
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

importExcel().catch(console.error);

