#!/bin/sh
set -e
# Only the EduPortal IELTS database is migrated. The EduPortal schema is NEVER migrated from here.
npx prisma migrate deploy --schema prisma/ielts/schema.prisma
exec node dist/main
