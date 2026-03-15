#!/bin/sh
set -e
# Default DB_HOST if not set
DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}

# Wait until PostgreSQL is ready
echo "⏳ Waiting for PostgreSQL to be ready..."
echo "$DB_HOST"
until pg_isready -h "$DB_HOST" -p "$DB_PORT" > /dev/null 2>&1; do
  echo "⏱️  Waiting for postgres..."
  sleep 2
done

# Optional: slight delay to ensure DB is *fully* ready
sleep 2

# ======================
# DATABASE MIGRATIONS
# ======================
echo "🚀 Starting database migrations..."
bun run db-dev:migrate-with-seed
echo "✅ Migrations completed successfully"

# ======================
# MAIN APPLICATION
# ======================
echo "🚀 Starting main application..."
exec "$@"
