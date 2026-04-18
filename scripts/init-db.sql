-- Runs once on first boot of the local docker-compose Postgres container.
-- Mounted at /docker-entrypoint-initdb.d/init-db.sql.

-- pgvector is present in the image (pgvector/pgvector:pg15) but the
-- extension still has to be created inside the target database.
CREATE EXTENSION IF NOT EXISTS vector;
