#!/bin/sh
set -e

# Wait for DB to become available
echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
while ! nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 1
done

# Run migrations and seed using compiled JS if available (ignore failures)
echo "Running migrations..."
if [ -f dist/scripts/migrate.js ]; then
  node dist/scripts/migrate.js || true
else
  npm run db:migrate || true
fi

echo "Seeding DB (if seed script exists)..."
if [ -f dist/scripts/seed.js ]; then
  node dist/scripts/seed.js || true
else
  npm run db:seed || true
fi

# Start the server
echo "Starting backend server..."
if [ -f dist/server.js ]; then
  node dist/server.js
elif [ -f dist/src/server.js ]; then
  node dist/src/server.js
else
  npm run start
fi
