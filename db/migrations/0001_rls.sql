-- KERF — isolation multi-tenant (ARCHITECTURE.md §3.1 à §3.3)
--
-- À appliquer APRÈS la migration générée par `npm run db:generate`
-- (0000_*.sql, qui crée les tables depuis lib/db/schema.ts).
--
-- Règle absolue : toute nouvelle table portant tenant_id doit être ajoutée
-- ici. tests/rls/isolation.test.ts échoue automatiquement si une table
-- avec une colonne tenant_id n'a pas la RLS activée — ne pas contourner ce
-- test, c'est le seul garde-fou contre une fuite de données entre clients
-- concurrents.

-- ---------------------------------------------------------------------------
-- Rôle applicatif. Sur Supabase il existe déjà (créé par la plateforme) ;
-- sur un Postgres nu ("alternative" évoquée dans PROGRESS.md), ce bloc le
-- crée pour que la RLS fonctionne à l'identique dans les deux cas.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

-- ---------------------------------------------------------------------------
-- Fonctions de lecture du JWT (STABLE : évaluées une fois par requête, pas
-- par ligne — sans ça chaque policy re-décode le JWT à chaque ligne scannée)
--
-- Sur Supabase, `auth.jwt()` existe déjà et lit la session PostgREST — on ne
-- la touche jamais, c'est une fonction gérée par la plateforme. Sur un
-- Postgres nu ("alternative"), elle n'existe pas : ce bloc la recrée à
-- l'identique (même contrat : lit `request.jwt.claims` posé par
-- l'application via lib/db/tenant-scope.ts) uniquement si elle est absente.
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regprocedure('auth.jwt()') is null then
    create schema if not exists auth;
    create function auth.jwt() returns jsonb
      language sql stable
    as $f$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
    $f$;
  end if;
end $$;

create or replace function current_tenant_id() returns uuid
  language sql stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')::uuid
$$;

create or replace function current_app_role() returns text
  language sql stable
as $$
  select auth.jwt() -> 'app_metadata' ->> 'role'
$$;

create or replace function is_platform_admin() returns boolean
  language sql stable
as $$
  select current_app_role() = 'platform_admin'
$$;

-- ---------------------------------------------------------------------------
-- tenants : chaque utilisateur ne voit que le sien ; platform_admin voit tout
-- (accès tracé dans audit_log côté application, voir ARCHITECTURE.md §3.2)
-- ---------------------------------------------------------------------------

alter table tenants enable row level security;

create policy tenants_isolation on tenants
  for all
  using (id = current_tenant_id() or is_platform_admin())
  with check (id = current_tenant_id() or is_platform_admin());

-- ---------------------------------------------------------------------------
-- Gabarit appliqué à toutes les tables tenant-scopées : lecture/écriture
-- limitées au tenant courant, sauf platform_admin (support, traçé).
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  tenant_scoped_tables text[] := array[
    'memberships', 'invitations', 'custom_field_defs', 'audit_log', 'attachments',
    'accounts', 'contacts', 'pipelines', 'pipeline_stages', 'deals', 'interactions', 'tasks',
    'products', 'price_lists', 'price_list_items', 'account_pricing', 'import_jobs',
    'quotes', 'quote_lines',
    'trials', 'trial_tools', 'trial_runs', 'trial_photos', 'trial_economics'
  ];
begin
  foreach t in array tenant_scoped_tables loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for all using (tenant_id = current_tenant_id() or is_platform_admin()) with check (tenant_id = current_tenant_id() or is_platform_admin())',
      t || '_isolation', t
    );
  end loop;
end $$;
