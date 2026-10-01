-- =============================================================================
-- Grant the missing profiles UPDATE column
-- =============================================================================
-- The 20260102 migration revokes table-level UPDATE on public.profiles and
-- re-grants only the safe columns, but its grant list omits
-- career_aspiration_source even though:
--   * the same migration adds the column (with a check constraint that
--     explicitly allows 'student', i.e. a value the app writes), and
--   * the app writes it when the student states a career aspiration.
--
-- On any database that already ran 20260102, PATCH /rest/v1/profiles fails
-- with 42501 ("permission denied") because the payload includes that column.
-- This statement is the targeted fix; it is idempotent and changes no other
-- privilege (ai_context / onboarding_completed stay server-only).

grant update (career_aspiration_source)
  on public.profiles to authenticated;
