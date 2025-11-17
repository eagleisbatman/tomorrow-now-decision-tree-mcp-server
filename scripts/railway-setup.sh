#!/bin/bash
# Railway Setup Script - Run migrations and import data
# This script can be run via Railway CLI: railway run bash scripts/railway-setup.sh

set -e

echo "🚀 Starting Railway database setup..."

# Run migrations
echo "📊 Running migrations..."
npm run setup

# Import Excel data
echo "📥 Importing Excel data..."
npm run import

echo "✅ Setup complete!"

