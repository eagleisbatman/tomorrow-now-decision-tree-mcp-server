# Decision Tree MCP Server

MCP server for crop decision trees based on weather parameters and growth stages. Provides agricultural recommendations using structured decision trees stored in a database.

## Overview

This MCP server:
- Stores decision tree rules per crop (Maize Early/Mid/Late, etc.)
- Evaluates weather conditions against decision tree rules
- Provides actionable farming advice based on crop growth stage and weather parameters
- Supports multiple crops and growth stages

## Quick Start

### 1. Setup Database

```bash
# Create PostgreSQL database
createdb decision_trees

# Run migrations
psql decision_trees < migrations/001_initial_schema.sql
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL
```

### 4. Import Excel Data

```bash
npm run import
```

This will:
- Parse the Excel file `[Digital Green] Maize Decision Trees.xlsx`
- Import crops, growth stages, decision tree rules, and GDD configurations
- Store everything in PostgreSQL

### 5. Build and Run

```bash
npm run build
npm start
```

Or for development:
```bash
npm run dev
```

## Database Schema

### Tables

1. **crops** - Crop varieties with base/cap temperatures
2. **growth_stages** - Growth stage definitions per crop
3. **decision_tree_rules** - Decision tree rules per crop/growth stage/parameter
4. **gdd_configs** - Growing Degree Day configurations per crop variety

## Excel File Structure

The Excel file `[Digital Green] Maize Decision Trees.xlsx` contains:
- **Sheet 1**: Growing Degree Days (GDDs) - Base temps, cap temps, GDD ranges per growth stage
- **Sheet 2**: Decision Trees - Rules with conditions (low/optimal/high) for each parameter
- **Sheet 3**: Definitions - Variable definitions (precipitation, humidity, temperature, P/PET, GDD)

## MCP Tools

### 1. `get_crop_recommendation`
Get farming advice based on crop, growth stage, and weather conditions.

**Parameters:**
- `crop` (string): Crop name (e.g., "maize")
- `growth_stage_order` (number): 1-6 (Germination, Establishment, Vegetative, Flowering, Grain Fill, Physiological Maturity)
- `variety_type` (optional): "Early", "Mid", or "Late" (default: "Early")
- `precipitation` (optional): Precipitation in mm (4-day total)
- `humidity` (optional): Relative humidity % (4-day average)
- `temperature` (optional): Temperature in Celsius (4-day average)
- `p_pet` (optional): P/PET ratio (10-day total)

**Returns:** Matching decision tree recommendations with actionable advice

### 2. `get_growth_stage`
Determine current growth stage based on accumulated Growing Degree Days (GDD).

**Parameters:**
- `crop` (string): Crop name
- `variety_type`: "Early", "Mid", or "Late"
- `accumulated_gdd` (number): Total accumulated GDD

**Returns:** Current growth stage name and order

### 3. `list_crops`
List all available crops in the database.

**Returns:** Array of crops with base/cap temperatures

### 4. `list_growth_stages`
List growth stages for a specific crop.

**Parameters:**
- `crop` (string): Crop name

**Returns:** Array of growth stages with names and orders

## Architecture

```
Excel File → Import Script → PostgreSQL Database → MCP Server → AI Agent
```

## Usage Example

```typescript
// Get recommendations for maize in vegetative stage
{
  "crop": "maize",
  "growth_stage_order": 3,
  "variety_type": "Early",
  "precipitation": 15,
  "humidity": 60,
  "temperature": 22,
  "p_pet": 0.9
}

// Response includes matching decision tree rules with advice messages
```

## Decision Tree Logic

The evaluator matches weather parameters against decision tree rules:
- **Low conditions**: Value below threshold (e.g., precipitation < 5mm)
- **Optimal conditions**: Value within range (e.g., precipitation 5-25mm)
- **High conditions**: Value above threshold (e.g., precipitation > 25mm)

Multiple rules can match simultaneously, providing comprehensive advice.

## Adding New Crops

1. Update Excel file with new crop data
2. Run `npm run import` to update database
3. MCP server automatically includes new crops

## Railway Deployment

This server is configured for Railway deployment.

### Setup Steps:

1. **Create Railway Project**
   - Go to [Railway](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select `tomorrow-now-decision-tree-mcp-server`

2. **Add PostgreSQL Database**
   - In Railway project, click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically create `DATABASE_URL` environment variable

3. **Run Database Migrations**
   - After deployment, connect to Railway PostgreSQL
   - Run: `psql $DATABASE_URL < migrations/001_initial_schema.sql`
   - Or use Railway's database console

4. **Import Excel Data** (One-time setup)
   - You'll need to run the import script locally or via Railway CLI:
   ```bash
   railway run npm run import
   ```
   - Note: Excel file must be in the project root for import

5. **Environment Variables**
   - `DATABASE_URL` - Automatically set by Railway PostgreSQL
   - `PORT` - Automatically set by Railway (default: 3001)
   - `ALLOWED_ORIGINS` - Optional, defaults to '*'

6. **Deploy**
   - Railway will automatically build and deploy on push to `main`
   - Build command: `npm run build`
   - Start command: `npm start`

### Railway Configuration

The `railway.json` file configures:
- Build command: `npm run build`
- Start command: `npm start`
- Restart policy: ON_FAILURE with max 10 retries

### Health Check

After deployment, verify the server:
```bash
curl https://your-app-name.up.railway.app/health
```

### MCP Endpoint

The MCP endpoint will be available at:
```
https://your-app-name.up.railway.app/mcp
```

