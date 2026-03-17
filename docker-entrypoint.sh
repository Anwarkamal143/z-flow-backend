#!/bin/sh
set -e

# ======================
# DATABASE MIGRATIONS
# ======================
echo "🚀 Starting database migrations..."
# bun run db-prod:migrate-with-seed
bun run db-prod:migrate-with-seed
echo "✅ Migrations completed successfully"

# ======================
# MAIN APPLICATION
# ======================
echo "🚀 Starting main application..."
exec "$@"