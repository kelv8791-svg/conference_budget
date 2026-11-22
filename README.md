# Conference Budget Control System

React and Vite application for conference budgets, inventory, daily consumption, and historical records.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Apply [`supabase_schema.sql`](./supabase_schema.sql) in the Supabase SQL editor for initial tables.
4. Apply [`supabase_migration.sql`](./supabase_migration.sql) to enable authentication, RLS, profiles, and revision locking.
5. Run:
   ```bash
   npm run dev
   ```

## Supabase accounts and roles

Create users in Supabase Authentication, then assign each user a role in `public.profiles`:

```sql
insert into public.profiles (id, role, display_name)
values ('USER_UUID', 'chef', 'Head Chef');
-- or role = 'storekeeper'
```

Profiles cannot be created or edited through the browser. Assign and revoke roles using the Supabase dashboard or a privileged admin workflow.

## Supabase data safety

- Shared data is readable and writable only by authenticated users with a profile.
- The PIN gate has been replaced by Supabase Authentication.
- `save_conference_state` uses an optimistic revision lock to prevent whole-row lost updates.
- The migration script is non-destructive and must be applied rather than rerunning the original demo reset.

## Validation

```bash
npm test
npm run lint
npm run build
```
