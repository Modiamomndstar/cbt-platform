#!/bin/sh
set -e

# Wait for DB to become available
echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
while ! nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 1
done

# Create initial schema (tables) first
echo "Creating database schema..."
if [ -f dist/scripts/init_schema.js ]; then
  node dist/scripts/init_schema.js
else
  echo "init_schema.js not found, skipping initial schema creation..."
fi

# Run migrations and seed using compiled JS if available
echo "Running migrations..."
if [ -f dist/scripts/migrate.js ]; then
  node dist/scripts/migrate.js
else
  npm run db:migrate
fi

echo "Seeding DB (if seed script exists)..."
if [ -f dist/scripts/seed.js ]; then
  node dist/scripts/seed.js
else
  # Only run npm run db:seed if the seed script actually exists to avoid npm error
  if [ -f scripts/seed.ts ]; then
    npm run db:seed
  else
    echo "No seed script found, skipping seeding."
  fi
fi

# Start the server
echo "Starting backend server..."
if [ "$#" -gt 0 ]; then
  exec "$@"
fi
if [ -f dist/server.js ]; then
  node dist/server.js
elif [ -f dist/src/server.js ]; then
  node dist/src/server.js
else
  npm run start
fi
