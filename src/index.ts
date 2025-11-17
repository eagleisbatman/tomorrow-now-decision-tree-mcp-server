import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { DecisionTreeEvaluator } from './decision-tree-evaluator.js';
import { getDbPool } from './db.js';

const app = express();

app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  exposedHeaders: ['Mcp-Session-Id'],
  allowedHeaders: ['Content-Type', 'mcp-session-id', 'Authorization']
}));

const PORT = process.env.PORT || 3001;
const evaluator = new DecisionTreeEvaluator();

app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'tomorrow-now-decision-tree-mcp-server',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
});

app.get('/', (req, res) => {
  res.json({
    service: 'TomorrowNow Decision Tree MCP Server',
    version: '1.0.0',
    description: 'Crop decision trees based on weather parameters and growth stages - TomorrowNow GAP Platform',
    endpoints: {
      health: '/health',
      mcp: '/mcp (POST)'
    },
    tools: [
      'get_crop_recommendation',
      'get_growth_stage',
      'list_crops',
      'list_growth_stages'
    ]
  });
});

app.post('/mcp', async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });

    const server = new McpServer({
      name: 'tomorrow-now-decision-tree-advisory',
      version: '1.0.0',
      description: 'Crop decision trees for agricultural recommendations based on weather and growth stage - TomorrowNow GAP Platform'
    });

    server.tool(
      'get_crop_recommendation',
      'Get farming recommendations based on crop, growth stage, and weather conditions. Returns actionable advice from decision tree rules.',
      {
        crop: z.string().describe('Crop name (e.g., "maize")'),
        growth_stage_order: z.number().min(1).max(6).describe('Growth stage order (1=Germination, 2=Establishment, 3=Vegetative, 4=Flowering, 5=Grain Fill, 6=Physiological Maturity)'),
        variety_type: z.enum(['Early', 'Mid', 'Late']).optional().describe('Crop variety type (Early, Mid, or Late)'),
        precipitation: z.number().optional().describe('Precipitation in mm (4-day total)'),
        humidity: z.number().optional().describe('Relative humidity percentage (4-day average)'),
        temperature: z.number().optional().describe('Temperature in Celsius (4-day average)'),
        p_pet: z.number().optional().describe('P/PET ratio (precipitation/potential evapotranspiration, 10-day total)')
      },
      async ({ crop, growth_stage_order, variety_type = 'Early', precipitation, humidity, temperature, p_pet }) => {
        try {
          const weatherData = {
            precipitation,
            humidity,
            temperature,
            p_pet
          };

          const results = await evaluator.evaluate(
            crop,
            growth_stage_order,
            variety_type,
            weatherData
          );

          if (results.length === 0) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  crop,
                  growth_stage_order,
                  variety_type,
                  recommendations: [],
                  message: 'No matching decision tree rules found for the provided weather conditions.'
                }, null, 2)
              }]
            };
          }

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                crop,
                growth_stage_order,
                variety_type,
                recommendations: results.map(r => ({
                  parameter: r.parameter,
                  condition: r.condition,
                  message: r.message
                })),
                summary: `Found ${results.length} recommendation(s) based on weather conditions.`
              }, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: error.message || 'Failed to evaluate decision tree'
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    server.tool(
      'get_growth_stage',
      'Determine current growth stage based on accumulated Growing Degree Days (GDD)',
      {
        crop: z.string().describe('Crop name (e.g., "maize")'),
        variety_type: z.enum(['Early', 'Mid', 'Late']).describe('Crop variety type'),
        accumulated_gdd: z.number().describe('Accumulated Growing Degree Days')
      },
      async ({ crop, variety_type, accumulated_gdd }) => {
        try {
          const stage = await evaluator.getGrowthStage(crop, variety_type, accumulated_gdd);
          
          if (!stage) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: `Could not determine growth stage for ${crop} ${variety_type} with ${accumulated_gdd} GDD`
                }, null, 2)
              }],
              isError: true
            };
          }

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                crop,
                variety_type,
                accumulated_gdd,
                growth_stage: stage.stage_name,
                growth_stage_order: stage.stage_order
              }, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: error.message || 'Failed to determine growth stage'
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    server.tool(
      'list_crops',
      'List all available crops in the decision tree database',
      {},
      async () => {
        try {
          const pool = getDbPool();
          const result = await pool.query(
            'SELECT name, display_name, base_temp_celsius, cap_temp_celsius FROM crops ORDER BY display_name'
          );

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                crops: result.rows
              }, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: error.message || 'Failed to list crops'
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    server.tool(
      'list_growth_stages',
      'List growth stages for a specific crop',
      {
        crop: z.string().describe('Crop name (e.g., "maize")')
      },
      async ({ crop }) => {
        try {
          const pool = getDbPool();
          const cropResult = await pool.query(
            'SELECT id FROM crops WHERE name = $1',
            [crop.toLowerCase()]
          );

          if (cropResult.rows.length === 0) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: `Crop not found: ${crop}`
                }, null, 2)
              }],
              isError: true
            };
          }

          const cropId = cropResult.rows[0].id;
          const stagesResult = await pool.query(
            'SELECT stage_name, stage_order FROM growth_stages WHERE crop_id = $1 ORDER BY stage_order',
            [cropId]
          );

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                crop,
                growth_stages: stagesResult.rows
              }, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: error.message || 'Failed to list growth stages'
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

  } catch (error) {
    console.error('[MCP] Error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
        data: error instanceof Error ? error.message : 'Unknown error'
      },
      id: null
    });
  }
});

const HOST = '0.0.0.0';
const server = app.listen(Number(PORT), HOST, () => {
  console.log('');
  console.log('🚀 =========================================');
  console.log('   TomorrowNow Decision Tree MCP Server');
  console.log('   Version 1.0');
  console.log('=========================================');
  console.log(`✅ Server running on ${HOST}:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🌾 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`🛠️  Tools: 4 (get_crop_recommendation, get_growth_stage, list_crops, list_growth_stages)`);
  console.log('=========================================');
  console.log('');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

