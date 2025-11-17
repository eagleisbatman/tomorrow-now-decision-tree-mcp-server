# Database Setup Guide

## Option 1: Using Railway CLI (Recommended)

1. **Link Railway project:**
   ```bash
   railway link
   ```

2. **Run migrations:**
   ```bash
   railway run npm run setup
   ```

3. **Import Excel data:**
   ```bash
   railway run npm run import
   ```

## Option 2: Using Railway Dashboard

1. **Get Database Connection String:**
   - Go to Railway dashboard → Your project → PostgreSQL service
   - Copy the `DATABASE_URL` (public connection string)

2. **Run migrations locally:**
   ```bash
   DATABASE_URL="your-public-connection-string" npm run setup
   ```

3. **Import Excel data:**
   ```bash
   DATABASE_URL="your-public-connection-string" npm run import
   ```

## Option 3: Direct SQL Execution

1. **Connect to Railway PostgreSQL:**
   - Use Railway's database console or connect via `psql`
   - Connection string: `postgresql://postgres:lQJdVGMpMYaKhPaOpgSxIfQoKwwSKbsC@postgres-f55f407f.railway.internal:5432/railway`

2. **Run migration SQL:**
   ```bash
   psql "postgresql://postgres:lQJdVGMpMYaKhPaOpgSxIfQoKwwSKbsC@postgres-f55f407f.railway.internal:5432/railway" < migrations/001_initial_schema.sql
   ```

3. **Import Excel data:**
   ```bash
   DATABASE_URL="postgresql://postgres:lQJdVGMpMYaKhPaOpgSxIfQoKwwSKbsC@postgres-f55f407f.railway.internal:5432/railway" npm run import
   ```

## Notes

- The internal Railway hostname (`postgres-f55f407f.railway.internal`) only works from within Railway's network
- For local development, use Railway CLI or get the public connection string from Railway dashboard
- The Excel file `[Digital Green] Maize Decision Trees.xlsx` must be in the parent directory (`../`)

