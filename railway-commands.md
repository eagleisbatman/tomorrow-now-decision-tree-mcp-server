# Railway Setup Commands

Since Railway CLI requires interactive linking, here are the commands to run **after linking**:

## After Railway CLI is linked:

```bash
railway link
railway run npm run railway:setup
```

## Or run individually:

```bash
railway run npm run setup
railway run npm run import
```

## Alternative: Use Railway Dashboard

1. Go to Railway Dashboard → Your Project → PostgreSQL Service
2. Click "Connect" → "Database Console"
3. Copy/paste the SQL from `migrations/001_initial_schema.sql`
4. Run it in the console
5. Then run the import script via Railway CLI:
   ```bash
   railway run npm run import
   ```

The internal hostname `postgres-f55f407f.railway.internal` only works from within Railway's network, so these commands must be run via Railway CLI or Railway Dashboard.
