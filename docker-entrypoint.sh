#!/bin/sh
set -e

# ======================
# DATABASE MIGRATIONS
# ======================
echo "🚀 Starting database migrations..."
# bun run db-prod:migrate-with-seed
bun  ./dist/db/migrate-seed-db.js
echo "✅ Migrations completed successfully"

# ======================
# MAIN APPLICATION
# ======================
echo "🚀 Starting main application..."
exec "$@"