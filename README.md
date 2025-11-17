# 🌾 TomorrowNow Decision Tree MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Railway](https://railway.app/button.svg)](https://railway.app)
[![MCP](https://img.shields.io/badge/Protocol-MCP-orange)](https://modelcontextprotocol.io)

**Production-ready Model Context Protocol (MCP) server providing AI-powered crop advisory services based on weather parameters and growth stages. Part of the TomorrowNow Global Access Platform (GAP) ecosystem.**

---

## 🎯 Overview

The TomorrowNow Decision Tree MCP Server transforms agricultural decision trees into actionable AI agent tools. It evaluates weather conditions (precipitation, humidity, temperature, P/PET ratio) against crop-specific decision rules to provide personalized farming recommendations based on growth stage and variety type.

### Key Capabilities

- 🌱 **Crop-Specific Decision Trees**: Stores and evaluates decision rules per crop variety (Early/Mid/Late)
- 📊 **Weather-Based Recommendations**: Analyzes precipitation, humidity, temperature, and P/PET ratios
- 🌾 **Growth Stage Intelligence**: Determines crop growth stage from accumulated Growing Degree Days (GDD)
- 🤖 **AI Agent Integration**: Seamless integration with OpenAI, Google Gemini, and other MCP-compatible AI agents
- 📈 **Scalable Architecture**: PostgreSQL-backed with support for multiple crops and regions
- 🌍 **Production Ready**: Deployed on Railway with health checks and error handling

---

## ✨ Features

### 4 MCP Tools

| Tool | Purpose | Use Case |
|------|---------|----------|
| `get_crop_recommendation` | Get farming advice based on weather conditions | "What should I do for my maize crop given current weather?" |
| `get_growth_stage` | Determine current growth stage from GDD | "What growth stage is my crop at?" |
| `list_crops` | List all available crops | "What crops are supported?" |
| `list_growth_stages` | List growth stages for a crop | "What are the growth stages for maize?" |

### Technical Features

- ✅ **PostgreSQL Database**: Scalable, relational storage for decision trees
- ✅ **Excel Import**: One-time import from structured Excel files
- ✅ **GDD Calculations**: Automatic growth stage determination
- ✅ **Multi-Parameter Evaluation**: Simultaneous analysis of multiple weather parameters
- ✅ **Structured Responses**: JSON-formatted recommendations with actionable advice
- ✅ **TypeScript**: Full type safety and production reliability
- ✅ **StreamableHTTP Transport**: Standard MCP protocol support
- ✅ **Error Handling**: Graceful failures with informative error messages

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database (local or Railway)
- Excel file with decision tree data (see [Excel File Structure](#excel-file-structure))

### Installation

```bash
# Clone the repository
git clone https://github.com/eagleisbatman/tomorrow-now-decision-tree-mcp-server.git
cd tomorrow-now-decision-tree-mcp-server

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Database Setup

1. **Create PostgreSQL database** (or use Railway PostgreSQL)

2. **Run migrations:**
   ```bash
   # Set DATABASE_URL environment variable
   export DATABASE_URL="postgresql://user:password@host:port/database"
   
   # Run migrations
   npm run setup
   ```

3. **Import Excel data:**
   ```bash
   # Place Excel file in parent directory
   # File: ../[Digital Green] Maize Decision Trees.xlsx
   
   npm run import
   ```

### Running the Server

```bash
# Production
npm start

# Development
npm run dev
```

The server will start on `http://localhost:3001` (or `PORT` environment variable).

---

## 📖 API Documentation

### Health Check

```bash
GET /health
```

Returns server status and version information.

**Response:**
```json
{
  "status": "healthy",
  "service": "tomorrow-now-decision-tree-mcp-server",
  "timestamp": "2025-11-17T15:01:05.316Z",
  "version": "1.0.0"
}
```

### MCP Endpoint

```bash
POST /mcp
Content-Type: application/json
Accept: application/json, text/event-stream
```

Standard MCP protocol endpoint. See [MCP Specification](https://modelcontextprotocol.io) for details.

---

## 🔧 MCP Tools Reference

### 1. `get_crop_recommendation`

Get farming recommendations based on crop, growth stage, and weather conditions.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `crop` | string | ✅ | Crop name (e.g., "maize") |
| `growth_stage_order` | number | ✅ | Growth stage order (1-6):<br>1=Germination<br>2=Establishment<br>3=Vegetative<br>4=Flowering<br>5=Grain Fill<br>6=Physiological Maturity |
| `variety_type` | enum | ❌ | Crop variety: "Early", "Mid", or "Late" (default: "Early") |
| `precipitation` | number | ❌ | Precipitation in mm (4-day total) |
| `humidity` | number | ❌ | Relative humidity % (4-day average) |
| `temperature` | number | ❌ | Temperature in Celsius (4-day average) |
| `p_pet` | number | ❌ | P/PET ratio (precipitation/potential evapotranspiration, 10-day total) |

**Example Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_crop_recommendation",
    "arguments": {
      "crop": "maize",
      "growth_stage_order": 3,
      "variety_type": "Early",
      "precipitation": 15,
      "humidity": 60,
      "temperature": 22,
      "p_pet": 0.9
    }
  },
  "id": 1
}
```

**Example Response:**
```json
{
  "result": {
    "content": [{
      "type": "text",
      "text": "{\n  \"crop\": \"maize\",\n  \"growth_stage_order\": 3,\n  \"variety_type\": \"Early\",\n  \"recommendations\": [\n    {\n      \"parameter\": \"Precipitation\",\n      \"condition\": \"optimal\",\n      \"message\": \"Good rains in forecast. Keep weeds down. Apply N fertilizer...\"\n    }\n  ]\n}"
    }]
  }
}
```

### 2. `get_growth_stage`

Determine current growth stage based on accumulated Growing Degree Days (GDD).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `crop` | string | ✅ | Crop name (e.g., "maize") |
| `variety_type` | enum | ✅ | Crop variety: "Early", "Mid", or "Late" |
| `accumulated_gdd` | number | ✅ | Total accumulated GDD since planting |

**Example:**
```json
{
  "crop": "maize",
  "variety_type": "Early",
  "accumulated_gdd": 500,
  "growth_stage": "Vegetative",
  "growth_stage_order": 3
}
```

### 3. `list_crops`

List all available crops in the database.

**Returns:** Array of crops with base/cap temperatures

### 4. `list_growth_stages`

List all growth stages for a specific crop.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `crop` | string | ✅ | Crop name (e.g., "maize") |

**Returns:** Array of growth stages with names and orders

---

## 🗄️ Database Schema

### Tables

1. **`crops`** - Crop varieties with base/cap temperatures
   - `id` (UUID)
   - `name` (VARCHAR) - Unique crop identifier
   - `display_name` (VARCHAR) - Human-readable name
   - `base_temp_celsius` (DECIMAL) - Base temperature for GDD calculation
   - `cap_temp_celsius` (DECIMAL) - Cap temperature for GDD calculation

2. **`growth_stages`** - Growth stage definitions per crop
   - `id` (UUID)
   - `crop_id` (UUID) - Foreign key to crops
   - `stage_name` (VARCHAR) - Stage name (e.g., "Vegetative")
   - `stage_order` (INTEGER) - Order (1-6)
   - `gdd_early_min/max` (INTEGER) - GDD ranges for Early variety
   - `gdd_mid_min/max` (INTEGER) - GDD ranges for Mid variety
   - `gdd_late_min/max` (INTEGER) - GDD ranges for Late variety

3. **`decision_tree_rules`** - Decision tree rules per crop/growth stage/parameter
   - `id` (UUID)
   - `crop_id` (UUID) - Foreign key to crops
   - `growth_stage_id` (UUID) - Foreign key to growth_stages
   - `parameter` (VARCHAR) - Weather parameter (P/PET, Precipitation, etc.)
   - `condition_type` (VARCHAR) - Condition: "low", "optimal", or "high"
   - `range_min/max` (VARCHAR) - Value ranges
   - `message_english` (TEXT) - Recommendation message

4. **`gdd_configs`** - Growing Degree Day configurations per crop variety
   - `id` (UUID)
   - `crop_id` (UUID) - Foreign key to crops
   - `variety_type` (VARCHAR) - "Early", "Mid", or "Late"
   - `growth_stage_id` (UUID) - Foreign key to growth_stages
   - `gdd_min/max` (INTEGER) - GDD range for this stage/variety

---

## 📊 Excel File Structure

The Excel import expects a file named `[Digital Green] Maize Decision Trees.xlsx` with three sheets:

### Sheet 1: Growing Degree Days (GDDs)
- Base temperature and cap temperature
- GDD ranges per growth stage for Early/Mid/Late varieties

### Sheet 2: Decision Trees
- Decision tree rules with:
  - Crop variety (e.g., "Maize_Early")
  - Parameter (P/PET, Precipitation, Relative Humidity, Temperature)
  - Growth stage name and order
  - Condition type (low, optimal, high)
  - Value ranges
  - Recommendation messages

### Sheet 3: Definitions
- Variable definitions and explanations

---

## 🏗️ Architecture

```
Excel File
    ↓
Import Script (scripts/import-excel.ts)
    ↓
PostgreSQL Database
    ↓
Decision Tree Evaluator (src/decision-tree-evaluator.ts)
    ↓
MCP Server (src/index.ts)
    ↓
AI Agent (OpenAI, Gemini, etc.)
```

### Decision Tree Logic

The evaluator matches weather parameters against decision tree rules:

- **Low conditions**: Value below threshold (e.g., precipitation < 5mm)
- **Optimal conditions**: Value within range (e.g., precipitation 5-25mm)
- **High conditions**: Value above threshold (e.g., precipitation > 25mm)

Multiple rules can match simultaneously, providing comprehensive advice.

---

## 🚢 Railway Deployment

This server is pre-configured for Railway deployment.

### Quick Deploy

1. **Fork/Clone** this repository
2. **Create Railway Project** → "Deploy from GitHub repo"
3. **Add PostgreSQL** → Railway automatically sets `DATABASE_URL`
4. **Run Migrations** → Use Railway CLI or Dashboard:
   ```bash
   railway run npm run setup
   railway run npm run import
   ```
5. **Deploy** → Railway automatically builds and deploys

### Environment Variables

Railway automatically sets:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3001)

Optional:
- `ALLOWED_ORIGINS` - CORS allowed origins (default: '*')

### Health Check

After deployment:
```bash
curl https://your-app-name.up.railway.app/health
```

---

## 🔌 Integration Examples

### OpenAI Agent Builder

```typescript
import { hostedMcpTool } from '@openai/agents';

const decisionTreeTool = hostedMcpTool({
  serverLabel: 'tomorrow-now-decision-tree',
  serverUrl: 'https://tomorrow-now-decision-tree-mcp-server.up.railway.app/mcp',
  allowedTools: ['get_crop_recommendation', 'get_growth_stage'],
  requireApproval: 'never'
});
```

### Google Gemini

```typescript
import { GoogleGenAI } from '@google/generative-ai';

// Configure Gemini with MCP server
// See gap-sdk-testing-gemini for full example
```

---

## 📈 Adding New Crops

1. **Update Excel file** with new crop data (GDDs and decision trees)
2. **Run import script:**
   ```bash
   npm run import
   ```
3. **Verify data:**
   ```sql
   SELECT * FROM crops WHERE name = 'new_crop';
   ```
4. **MCP server automatically includes** new crops in tool responses

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🔗 Related Projects

- **[GAP Agriculture MCP Server](https://github.com/eagleisbatman/gap-agriculture-mcp)** - Weather forecast MCP server
- **[GAP SDK Testing (OpenAI)](https://github.com/eagleisbatman/gap-sdk-testing)** - OpenAI SDK testing framework
- **[GAP SDK Testing (Gemini)](https://github.com/eagleisbatman/gap-sdk-testing-gemini)** - Google Gemini SDK testing framework
- **[TomorrowNow GAP Platform](https://tomorrownow.org)** - Global Access Platform for agricultural intelligence

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/eagleisbatman/tomorrow-now-decision-tree-mcp-server/issues)
- **Documentation**: See [RAILWAY_SETUP_INSTRUCTIONS.md](./RAILWAY_SETUP_INSTRUCTIONS.md) for deployment details
- **MCP Protocol**: [Model Context Protocol](https://modelcontextprotocol.io)

---

**Built with ❤️ for the TomorrowNow Global Access Platform**
