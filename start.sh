#!/bin/sh
echo "DATABASE_URL defined: $([ -n "$DATABASE_URL" ] && echo YES || echo NO)"
echo "Running prisma db push..."
npx prisma db push --accept-data-loss
echo "Prisma push done. Starting server..."
node dist/server.js
