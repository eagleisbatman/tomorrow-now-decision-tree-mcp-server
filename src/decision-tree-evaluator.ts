import { getDbPool, DecisionRule } from './db.js';

interface WeatherData {
  precipitation?: number;
  humidity?: number;
  temperature?: number;
  p_pet?: number;
}

interface EvaluationResult {
  parameter: string;
  condition: string;
  message: string;
  matched: boolean;
}

export class DecisionTreeEvaluator {
  private pool = getDbPool();

  async evaluate(
    cropName: string,
    growthStageOrder: number,
    varietyType: 'Early' | 'Mid' | 'Late',
    weatherData: WeatherData
  ): Promise<EvaluationResult[]> {
    const cropResult = await this.pool.query(
      'SELECT id FROM crops WHERE name = $1',
      [cropName.toLowerCase()]
    );

    if (cropResult.rows.length === 0) {
      throw new Error(`Crop not found: ${cropName}`);
    }

    const cropId = cropResult.rows[0].id;

    const stageResult = await this.pool.query(
      'SELECT id FROM growth_stages WHERE crop_id = $1 AND stage_order = $2',
      [cropId, growthStageOrder]
    );

    if (stageResult.rows.length === 0) {
      throw new Error(`Growth stage ${growthStageOrder} not found for ${cropName}`);
    }

    const stageId = stageResult.rows[0].id;

    const rulesResult = await this.pool.query(
      `SELECT parameter, condition_type, units, range_min, range_max, message_english
       FROM decision_tree_rules
       WHERE crop_id = $1 AND growth_stage_id = $2
       ORDER BY parameter, condition_type`,
      [cropId, stageId]
    );

    const rules: DecisionRule[] = rulesResult.rows;
    const results: EvaluationResult[] = [];

    for (const rule of rules) {
      const value = this.getParameterValue(rule.parameter, weatherData);
      if (value === null || value === undefined) continue;

      const matched = this.evaluateRule(rule, value);
      results.push({
        parameter: rule.parameter,
        condition: rule.condition_type,
        message: rule.message_english,
        matched
      });
    }

    return results.filter(r => r.matched);
  }

  private getParameterValue(parameter: string, weatherData: WeatherData): number | null {
    switch (parameter) {
      case 'P/PET':
        return weatherData.p_pet ?? null;
      case 'Precipitation':
        return weatherData.precipitation ?? null;
      case 'Relative Humidity':
        return weatherData.humidity ?? null;
      case 'Temperature':
        return weatherData.temperature ?? null;
      default:
        return null;
    }
  }

  private evaluateRule(rule: DecisionRule, value: number): boolean {
    const range = rule.range_min;
    if (!range) return false;

    switch (rule.condition_type) {
      case 'low':
        return this.isLow(value, range, rule.units);
      case 'optimal':
        return this.isOptimal(value, range, rule.units);
      case 'high':
        return this.isHigh(value, range, rule.units);
      default:
        return false;
    }
  }

  private isLow(value: number, range: string, units: string): boolean {
    if (range.includes('-')) {
      const [min, max] = range.split('-').map(s => this.parseValue(s.trim(), units));
      return value < min;
    }
    if (range.includes('<')) {
      const threshold = this.parseValue(range.replace('<', '').trim(), units);
      return value < threshold;
    }
    return false;
  }

  private isOptimal(value: number, range: string, units: string): boolean {
    if (range.includes('-')) {
      const parts = range.split('-');
      const min = this.parseValue(parts[0].trim(), units);
      const max = parts.length > 1 ? this.parseValue(parts[1].trim(), units) : min + 10;
      return value >= min && value <= max;
    }
    return false;
  }

  private isHigh(value: number, range: string, units: string): boolean {
    if (range.includes('>')) {
      const threshold = this.parseValue(range.replace('>', '').trim(), units);
      return value > threshold;
    }
    if (range.includes('+')) {
      const threshold = this.parseValue(range.replace('+', '').trim(), units);
      return value > threshold;
    }
    if (range.includes('-')) {
      const parts = range.split('-');
      const max = this.parseValue(parts[parts.length - 1].trim(), units);
      return value > max;
    }
    return false;
  }

  private parseValue(str: string, units: string): number {
    str = str.replace(/[°C%mm]/g, '').trim();
    return parseFloat(str) || 0;
  }

  async getGrowthStage(
    cropName: string,
    varietyType: 'Early' | 'Mid' | 'Late',
    accumulatedGDD: number
  ): Promise<{ stage_name: string; stage_order: number } | null> {
    const cropResult = await this.pool.query(
      'SELECT id FROM crops WHERE name = $1',
      [cropName.toLowerCase()]
    );

    if (cropResult.rows.length === 0) {
      return null;
    }

    const cropId = cropResult.rows[0].id;

    const gddResult = await this.pool.query(
      `SELECT gs.stage_name, gs.stage_order
       FROM growth_stages gs
       JOIN gdd_configs gc ON gc.growth_stage_id = gs.id
       WHERE gc.crop_id = $1 AND gc.variety_type = $2
         AND $3 >= gc.gdd_min AND $3 <= gc.gdd_max
       ORDER BY gs.stage_order DESC
       LIMIT 1`,
      [cropId, varietyType, accumulatedGDD]
    );

    if (gddResult.rows.length > 0) {
      return gddResult.rows[0];
    }

    const fallbackResult = await this.pool.query(
      `SELECT stage_name, stage_order
       FROM growth_stages
       WHERE crop_id = $1
       ORDER BY stage_order DESC
       LIMIT 1`,
      [cropId]
    );

    return fallbackResult.rows[0] || null;
  }
}

