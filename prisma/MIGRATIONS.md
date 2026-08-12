# Database migrations

The database is PostgreSQL (Neon). Prisma 7 is configured through `prisma.config.ts`,
which reads `DATABASE_URL_UNPOOLED` (falling back to `DATABASE_URL`) and keeps
migrations in `prisma/migrations`.

## Current state: one squashed baseline

`prisma/migrations` contains a single migration:

```
20260812000000_squashed_baseline/migration.sql
```

It is generated from `prisma/schema.prisma` and creates the whole schema from
scratch. Applying it to an empty Postgres database reproduces the current schema
exactly.

### Why it was squashed

The project started on SQLite and later moved to Postgres/Neon. The 16 migrations
that used to live here were never regenerated — the first one
(`20260526142658_init`) was still SQLite DDL using `DATETIME` and `REAL`, which do
not exist in Postgres. `prisma migrate deploy` against an empty Postgres database
failed immediately with:

```
ERROR: type "datetime" does not exist (42704)
```

Production was unaffected because it was originally created with `prisma db push`,
not by running migrations, and its history was baselined by hand on 2026-08-12
(all 16 migrations marked applied with `prisma migrate resolve --applied`). So
production was consistent, but the migrations folder could not build a new database
— no fresh environment, preview branch, or local setup could be provisioned from it.

The 16 old migrations were replaced by the squashed baseline above. They are still
in git history if you ever need to read them.

## One-time step: baseline production against the new folder

**This must be done before anyone runs `prisma migrate deploy` against production.**

Production already has every table the baseline would create. Its `_prisma_migrations`
table lists the 16 old migration names, none of which exist in `prisma/migrations`
anymore, and it does *not* list `20260812000000_squashed_baseline`. If `migrate deploy`
runs first, it will treat the baseline as pending, try to `CREATE TABLE` tables that
already exist, and fail — leaving a failed row in `_prisma_migrations` that then has to
be cleared with `prisma migrate resolve --rolled-back`.

Mark the baseline as already applied instead:

```bash
DATABASE_URL_UNPOOLED="<production-unpooled-url>" npx prisma migrate resolve --applied 20260812000000_squashed_baseline
```

This only inserts a row into `_prisma_migrations`; it runs none of the SQL and does
not touch any table.

Then confirm production is clean:

```bash
DATABASE_URL_UNPOOLED="<production-unpooled-url>" npx prisma migrate status
```

### The old history rows can stay

The 16 old rows in `_prisma_migrations` do not need to be deleted, and there is no
need to clean them up. `prisma migrate deploy` only lists the local migrations
directory and applies whatever is missing from the database — it never runs the
divergence check, so migration names present in the database but absent locally are
ignored. `prisma migrate status` does run that check, but once the baseline row
exists it reports "Database schema is up to date!" and exits 0 regardless of the
old rows (verified against a replica of production's history).

Before the resolve step, `migrate status` reports the histories as diverged with
"The last common migration is: null" — that is expected, and the resolve fixes it.

## Creating a new database (local, preview, or a Neon branch)

```bash
DATABASE_URL_UNPOOLED="<empty-database-url>" npx prisma migrate deploy
```

Nothing else is needed — no baselining, no `db push`. Do not run `db push` against
any database you also intend to migrate; that is what created this problem originally.

## Adding migrations from here on

```bash
npx prisma migrate dev --name <descriptive_name>
```

Then commit the generated folder and apply it to production with
`prisma migrate deploy`. Note that `migrate dev` needs a shadow database and will
reset the target database, so point it at a scratch database — never production.

## How the baseline was verified

- Generated with
  `npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`.
  (In Prisma 7 the flag is `--to-schema`; `--to-schema-datamodel` was removed.)
- `prisma migrate deploy` was run end-to-end against an empty Postgres instance and
  applied cleanly.
- Against that freshly migrated database, `prisma migrate status` reported
  "Database schema is up to date!" and
  `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma`
  produced an empty migration — i.e. zero drift from `schema.prisma`.
- The resulting structure was compared against production, read-only: 116/116 columns
  identical (name, type, nullability, default, datetime precision) and 27/27 indexes
  identical by name and definition.

The one catalog-level difference: on production `Newsletter_phone_key` is a `UNIQUE`
table constraint (it was added with `ALTER TABLE ... ADD CONSTRAINT`), whereas the
baseline creates it as a bare `CREATE UNIQUE INDEX`. Both enforce the same uniqueness
and Prisma treats them as the same thing — a database built in production's form also
diffs empty against `schema.prisma`. Nothing needs to be changed on production.

## What the resolve step actually does

It inserts exactly one row into `_prisma_migrations` and nothing else — no DDL runs,
no table or row is touched. Verified by replaying it against a local replica of
production (same schema, same 17 history rows, with data in the tables):

- `_prisma_migrations` went from 17 rows to 18; the new row is
  `20260812000000_squashed_baseline` with `finished_at` set,
  `applied_steps_count = 0`, and the real checksum of `migration.sql`.
- Table count, table contents, and every other history row were unchanged.
- Afterwards `prisma migrate deploy` reported "No pending migrations to apply."
  and `prisma migrate status` reported "Database schema is up to date!" (exit 0).

Skipping it and running `migrate deploy` straight away fails, as expected:

```
Error: P3018 ... Database error code: 42P07
ERROR: relation "Category" already exists
```

Recovering from that means `prisma migrate resolve --rolled-back
20260812000000_squashed_baseline` to clear the failed row, then the
`--applied` command above. No data is lost either way — the migration aborts on the
first `CREATE TABLE` — but it is an avoidable mess.
