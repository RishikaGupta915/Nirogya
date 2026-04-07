# Backend setup

This project uses Supabase (Postgres) + Prisma. Backend artifacts live at the repo root (prisma/, migrations). This folder just documents the flow.

## Env
Set these in `.env` (root):

```
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres?sslmode=require
DIRECT_URL=postgresql://postgres:<password>@<host>:5432/postgres?sslmode=require
```
Get the connection string from Supabase ? Project Settings ? Database ? Connection string ? URI. Keep `sslmode=require`.

## Commands (run from repo root)
- Generate client: `npx prisma generate`
- Apply migrations to Supabase: `npx prisma migrate deploy`
- View DB: `npx prisma studio`

## RLS policies
Already included in migration `prisma/migrations/20260407_init/migration.sql` (per-user access by `auth.uid()`).

## Auth note
`signInWithGoogle` is currently mocked for dev. Remove the mock and restore real OAuth when your redirect URIs are fully configured.
