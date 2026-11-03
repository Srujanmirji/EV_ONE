#!/bin/sh
# Overrides the postgis image's init script. Prisma migrations own the
# `postgis` extension; this only creates the empty shadow database that
# `prisma migrate dev` needs. Both databases start without extensions.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
CREATE DATABASE evone_shadow TEMPLATE template0;
SQL
