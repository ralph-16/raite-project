-- =============================================================================
-- Supersede 20261002000000_grant_profiles_aspiration_source.sql
-- =============================================================================
-- The 20261002 migration granted UPDATE(career_aspiration_source) on
-- public.profiles to authenticated. That grant is no longer needed:
-- app/api/profiler/route.ts persistProfile() writes career_aspiration_source
-- (and career_aspiration_set_at) through the service-role client, with
-- user_id taken from the verified session — never through the student's own
-- session. The column was already covered by the 20260102 column-grant list,
-- so this revoke restores the least-privilege intent without changing what
-- the app can do.
--
-- Safe to apply whether or not 20261002 ever ran: revoking a privilege that
-- was never granted is a no-op (Postgres raises a warning, not an error).
-- Apply with: supabase db push
-- (NOT applied by authoring this file — run it against each environment.)

revoke update (career_aspiration_source)
  on public.profiles from authenticated, anon;
