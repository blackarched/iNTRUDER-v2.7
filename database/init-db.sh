#!/bin/bash
set -e

# Run the schema creation script
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" < /docker-entrypoint-initdb.d/database_schema.sql

echo "✅ NEXUS database schema successfully deployed."