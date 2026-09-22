#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is required."
  exit 1
fi

echo "Checking/applying PostgreSQL schema..."
npx drizzle-kit push --config=drizzle.config.ts --force

echo "Starting News Pulse..."
exec npm start
