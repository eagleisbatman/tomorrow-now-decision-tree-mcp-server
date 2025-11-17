# Railway Database Setup - Quick Instructions

## Option 1: Railway Dashboard (Easiest - No CLI needed)

### Step 1: Run Migrations via Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app)
2. Navigate to your project → PostgreSQL service
3. Click **"Connect"** → **"Database Console"**
4. Copy the entire contents of `migrations/001_initial_schema.sql`
5. Paste into the SQL console and click **"Run"**
6. Verify tables were created (you should see: `crops`, `growth_stages`, `decision_tree_rules`, `gdd_configs`)

### Step 2: Import Excel Data via Railway CLI

After migrations are done, run this command (you'll need Railway CLI linked):

```bash
railway link
railway run npm run import
```

**OR** if Railway CLI is already linked:

```bash
railway run npm run import
```

---

## Option 2: Railway CLI (Both Steps)

If Railway CLI is already linked to your project:

```bash
# Run both migrations and import in one command
railway run npm run railway:setup

# OR run separately:
railway run npm run setup
railway run npm run import
```

---

## Option 3: Manual SQL + Manual Import

If you prefer to do everything manually:

1. **Run migrations** via Railway Dashboard (see Option 1, Step 1)
2. **Import data manually** by:
   - Opening Railway Database Console
   - Running INSERT statements (not recommended - use the import script instead)

---

## Verification

After setup, verify the database has data:

```sql
-- Check crops
SELECT COUNT(*) FROM crops;

-- Check growth stages  
SELECT COUNT(*) FROM growth_stages;

-- Check decision tree rules
SELECT COUNT(*) FROM decision_tree_rules;

-- Check GDD configs
SELECT COUNT(*) FROM gdd_configs;
```

You should see:
- At least 1 crop (Maize)
- 6 growth stages
- Multiple decision tree rules
- Multiple GDD configurations

---

## Troubleshooting

**Error: "Tables already exist"**
- This is fine! The migrations are idempotent
- Just proceed to import step

**Error: "Excel file not found"**
- Make sure `[Digital Green] Maize Decision Trees.xlsx` is in the parent directory
- Or update the path in `scripts/import-excel.ts`

**Error: "Cannot connect to database"**
- Make sure Railway PostgreSQL service is running
- Check that `DATABASE_URL` environment variable is set in Railway

---

## Database Credentials (for reference)

**Public Connection** (works from anywhere):
```
postgresql://postgres:lQJdVGMpMYaKhPaOpgSxIfQoKwwSKbsC@switchyard.proxy.rlwy.net:35347/railway
```

**Internal Connection** (only works from Railway network):
```
postgresql://postgres:lQJdVGMpMYaKhPaOpgSxIfQoKwwSKbsC@postgres-f55f407f.railway.internal:5432/railway
```

**Note:** Use the public connection string for local development. Railway automatically sets `DATABASE_URL` in the deployed environment.

