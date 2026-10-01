-- =============================================================================
-- Ka-Lakbay — Full Database Schema (single-file setup)
-- =============================================================================
-- Target: Supabase (PostgreSQL 15+)
--
-- HOW TO RUN
--   Dashboard: https://supabase.com/dashboard/project/<ref>/sql  -> New query -> paste -> Run
--   CLI:       psql "$DATABASE_URL" -f supabase/schema.sql
--
-- This file is the concatenation of the numbered migrations, for a FRESH
-- database. If you have already applied any migration, use the files in
-- supabase/migrations/ instead — re-running those parts will fail.
--
-- For incremental changes:
--   supabase db push          # applies migrations in order
--   supabase db reset         # drops local DB, replays migrations + seed.sql
--
-- See supabase/DATABASE.md for full schema documentation.
--
-- Sections
--   1. Extensions & shared functions
--   2. Enumerated domains
--   3. Profiles
--   4. Onboarding
--   5. Resume / context
--   6. Careers
--   7. Skills
--   8. Career-skill relationships
--   9. Career relationships
--  10. Roadmaps
--  11. Roadmap nodes
--  12. Resources
--  13. User skills
--  14. Learning activities
--  15. Challenges
--  16. Submissions / proof
--  17. Career exploration
--  18. AI conversations
--  19. RLS
--  20. Functions / RPC
--  21. Seed data
--
-- Reference data is flagged is_sample_data = true: compensation, market demand
-- and learning-effort figures are illustrative and must be shown as estimates.
-- =============================================================================

-- =============================================================================
-- Ka-Lakbay — Initial Schema
-- AI-Powered Student Career Navigator
-- Target: Supabase (PostgreSQL 15+)
--
-- Apply via: Supabase Dashboard > SQL Editor, or `supabase db push`
-- =============================================================================

-- =============================================================================
-- 1. Extensions & shared functions
-- =============================================================================

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;

-- Reusable trigger: keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Generic BEFORE UPDATE trigger that sets updated_at = now().';

-- Helper: does this auth user own this row? Keeps RLS policies short.
create or replace function public.is_owner(row_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() = row_user_id;
$$;

comment on function public.is_owner(uuid) is
  'SECURITY DEFINER helper so RLS policies can read auth.uid() without recursion.';


-- =============================================================================
-- 2. Enumerated domains
-- =============================================================================

-- Proof-based learning states (see components/proof-based-learning.tsx)
create type public.skill_state as enum (
  'started',
  'developing',
  'demonstrated',
  'strong'
);

-- Career families (see components/career-exploration.tsx)
create type public.career_category as enum (
  'build',
  'analyze',
  'design',
  'communicate'
);

create type public.activity_kind as enum (
  'concept',
  'example',
  'practice'
);

create type public.progress_status as enum (
  'not_started',
  'in_progress',
  'completed'
);

create type public.message_role as enum (
  'user',
  'assistant'
);


-- =============================================================================
-- 3. Profile (1:1 with auth.users)
-- =============================================================================

create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  display_name        text not null check (length(btrim(display_name)) > 0),
  program             text,
  graduation_year     smallint check (graduation_year between 1950 and 2100),
  bio                 text,
  interests           text[] not null default '{}',
  learning_preferences jsonb not null default '{}'::jsonb,
  resume_url          text,
  onboarding_completed_at timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.profiles is
  'Explorer Profile: the student''s interests, experience and learning preferences.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Covering index: profile lookups are always by id, but dashboard sorts by recency.
create index profiles_created_at_idx on public.profiles (created_at desc);


-- =============================================================================
-- 4. Reference data: skills & careers
-- =============================================================================

create table public.skills (
  id          uuid primary key default extensions.gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  category    text not null default 'general',
  description text,
  created_at  timestamptz not null default now()
);

create index skills_category_idx on public.skills (category);
-- Trigram/GIN for fuzzy skill search in the explorer.
create index skills_name_trgm_idx on public.skills
  using gin (name extensions.gin_trgm_ops);

create table public.careers (
  id          uuid primary key default extensions.gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  category    public.career_category not null,
  description text,
  created_at  timestamptz not null default now()
);

create index careers_category_idx on public.careers (category);

-- Career <-> skill requirements with relative importance.
create table public.career_skills (
  career_id  uuid not null references public.careers (id) on delete cascade,
  skill_id   uuid not null references public.skills (id) on delete cascade,
  importance smallint not null default 3 check (importance between 1 and 5),
  primary key (career_id, skill_id)
);

-- Reverse lookup: "which careers need this skill?"
create index career_skills_skill_id_idx on public.career_skills (skill_id);


-- =============================================================================
-- 5. User skill tracking
-- =============================================================================

create table public.user_skills (
  user_id     uuid not null references auth.users (id) on delete cascade,
  skill_id    uuid not null references public.skills (id) on delete cascade,
  state       public.skill_state not null default 'started',
  confidence  smallint not null default 0 check (confidence between 0 and 100),
  started_at  timestamptz not null default now(),
  demonstrated_at timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (user_id, skill_id)
);

comment on table public.user_skills is
  'Per-student skill state: started -> developing -> demonstrated -> strong.';

create trigger user_skills_set_updated_at
  before update on public.user_skills
  for each row execute function public.set_updated_at();

-- Dashboard query: "my skills, worst first"
create index user_skills_user_state_idx on public.user_skills (user_id, state);
-- Skill-gap analysis across the whole cohort
create index user_skills_skill_id_idx on public.user_skills (skill_id);


-- =============================================================================
-- 6. Learning content (small activities + proof challenges)
-- =============================================================================

create table public.learning_activities (
  id         uuid primary key default extensions.gen_random_uuid(),
  skill_id   uuid not null references public.skills (id) on delete cascade,
  kind       public.activity_kind not null default 'concept',
  title      text not null,
  content    text not null default '',
  position   smallint not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

-- Ordered content fetch for one skill
create index learning_activities_skill_position_idx
  on public.learning_activities (skill_id, position);

create table public.challenges (
  id          uuid primary key default extensions.gen_random_uuid(),
  skill_id    uuid not null references public.skills (id) on delete cascade,
  title       text not null,
  description text not null default '',
  rubric      jsonb not null default '[]'::jsonb,
  position    smallint not null default 0 check (position >= 0),
  created_at  timestamptz not null default now()
);

create index challenges_skill_position_idx
  on public.challenges (skill_id, position);

create table public.activity_progress (
  user_id      uuid not null references auth.users (id) on delete cascade,
  activity_id  uuid not null references public.learning_activities (id) on delete cascade,
  status       public.progress_status not null default 'not_started',
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, activity_id)
);

create trigger activity_progress_set_updated_at
  before update on public.activity_progress
  for each row execute function public.set_updated_at();

create index activity_progress_user_status_idx
  on public.activity_progress (user_id, status);


-- =============================================================================
-- 7. Proof: challenge submissions and AI evaluation
-- =============================================================================

create table public.challenge_submissions (
  id           uuid primary key default extensions.gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  content      text not null default '',
  repo_url     text,
  status       text not null default 'submitted'
                 check (status in ('submitted', 'evaluating', 'passed', 'needs_revision')),
  score        smallint check (score between 0 and 100),
  evaluation   jsonb,
  evaluated_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.challenge_submissions is
  'Evidence of skill application. `evaluation` holds the rubric scoring output.';

create trigger challenge_submissions_set_updated_at
  before update on public.challenge_submissions
  for each row execute function public.set_updated_at();

create index challenge_submissions_user_created_idx
  on public.challenge_submissions (user_id, created_at desc);
create index challenge_submissions_challenge_status_idx
  on public.challenge_submissions (challenge_id, status);


-- =============================================================================
-- 8. Career exploration
-- =============================================================================

create table public.career_exploration (
  user_id   uuid not null references auth.users (id) on delete cascade,
  career_id uuid not null references public.careers (id) on delete cascade,
  fit_score smallint check (fit_score between 0 and 100),
  notes     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, career_id)
);

comment on table public.career_exploration is
  'Saved career paths plus the computed skill-fit score.';

create trigger career_exploration_set_updated_at
  before update on public.career_exploration
  for each row execute function public.set_updated_at();

create index career_exploration_user_fit_idx
  on public.career_exploration (user_id, fit_score desc);


-- =============================================================================
-- 9. AI companion conversation log
-- =============================================================================

create table public.conversations (
  id         uuid primary key default extensions.gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index conversations_user_created_idx
  on public.conversations (user_id, created_at desc);

create table public.messages (
  id              uuid primary key default extensions.gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            public.message_role not null,
  content         text not null,
  created_at      timestamptz not null default now()
);

comment on table public.messages is
  'Messages are immutable; user_id is denormalized for direct RLS + fast history reads.';

-- Cursor pagination for chat history (no OFFSET)
create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);


-- =============================================================================
-- 10. Row Level Security
-- =============================================================================

alter table public.profiles              enable row level security;
alter table public.skills                enable row level security;
alter table public.careers               enable row level security;
alter table public.career_skills         enable row level security;
alter table public.user_skills           enable row level security;
alter table public.learning_activities   enable row level security;
alter table public.challenges            enable row level security;
alter table public.activity_progress     enable row level security;
alter table public.challenge_submissions enable row level security;
alter table public.career_exploration    enable row level security;
alter table public.conversations         enable row level security;
alter table public.messages              enable row level security;

-- ---- profiles: owner only
create policy "profiles_select_own" on public.profiles
  for select using (public.is_owner(id));
create policy "profiles_insert_own" on public.profiles
  for insert with check (public.is_owner(id));
create policy "profiles_update_own" on public.profiles
  for update using (public.is_owner(id)) with check (public.is_owner(id));
create policy "profiles_delete_own" on public.profiles
  for delete using (public.is_owner(id));

-- ---- reference data: world-readable, service-role writable
create policy "skills_read_all" on public.skills
  for select using (true);
create policy "careers_read_all" on public.careers
  for select using (true);
create policy "career_skills_read_all" on public.career_skills
  for select using (true);
create policy "learning_activities_read_all" on public.learning_activities
  for select using (true);
create policy "challenges_read_all" on public.challenges
  for select using (true);

-- ---- user data: owner only
create policy "user_skills_select_own" on public.user_skills
  for select using (public.is_owner(user_id));
create policy "user_skills_insert_own" on public.user_skills
  for insert with check (public.is_owner(user_id));
create policy "user_skills_update_own" on public.user_skills
  for update using (public.is_owner(user_id)) with check (public.is_owner(user_id));
create policy "user_skills_delete_own" on public.user_skills
  for delete using (public.is_owner(user_id));

create policy "activity_progress_select_own" on public.activity_progress
  for select using (public.is_owner(user_id));
create policy "activity_progress_insert_own" on public.activity_progress
  for insert with check (public.is_owner(user_id));
create policy "activity_progress_update_own" on public.activity_progress
  for update using (public.is_owner(user_id)) with check (public.is_owner(user_id));

create policy "submissions_select_own" on public.challenge_submissions
  for select using (public.is_owner(user_id));
create policy "submissions_insert_own" on public.challenge_submissions
  for insert with check (public.is_owner(user_id));
create policy "submissions_update_own" on public.challenge_submissions
  for update using (public.is_owner(user_id)) with check (public.is_owner(user_id));

create policy "career_exploration_select_own" on public.career_exploration
  for select using (public.is_owner(user_id));
create policy "career_exploration_insert_own" on public.career_exploration
  for insert with check (public.is_owner(user_id));
create policy "career_exploration_update_own" on public.career_exploration
  for update using (public.is_owner(user_id)) with check (public.is_owner(user_id));
create policy "career_exploration_delete_own" on public.career_exploration
  for delete using (public.is_owner(user_id));

create policy "conversations_select_own" on public.conversations
  for select using (public.is_owner(user_id));
create policy "conversations_insert_own" on public.conversations
  for insert with check (public.is_owner(user_id));

create policy "messages_select_own" on public.messages
  for select using (public.is_owner(user_id));
create policy "messages_insert_own" on public.messages
  for insert with check (public.is_owner(user_id));


-- =============================================================================
-- 11. Auto-create a profile when a user signs up
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, 'student'), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================================================
-- 12. Skill-gap RPC (index-backed, replaces N+1 client queries)
-- =============================================================================

create or replace function public.get_skill_gaps(p_career_id uuid)
returns table (
  skill_id uuid,
  skill_name text,
  importance smallint,
  current_state public.skill_state,
  gap smallint
)
language sql
stable
security invoker
set search_path = ''
as $$
  -- The outer SELECT names this column `gap`; Postgres resolves the ORDER BY
  -- against the FROM items first, so repeat the expression instead of aliasing.
  select
    s.id,
    s.name,
    cs.importance,
    coalesce(us.state, 'started')::public.skill_state,
    cs.importance
      - case coalesce(us.state, 'started')
          when 'strong'       then 5
          when 'demonstrated' then 4
          when 'developing'   then 2
          else 1
        end
  from public.career_skills cs
  join public.skills s on s.id = cs.skill_id
  left join public.user_skills us
    on us.skill_id = cs.skill_id
   and us.user_id = auth.uid()
  where cs.career_id = p_career_id
    and cs.importance > case coalesce(us.state, 'started')
          when 'strong'       then 5
          when 'demonstrated' then 4
          when 'developing'   then 2
          else 1
        end
  -- Ordinal 5 is the gap expression; naming it would require a CTE, and the
  -- output column `gap` is not in scope for ORDER BY in a RETURNS TABLE body.
  order by 5 desc, s.name;
$$;

comment on function public.get_skill_gaps(uuid) is
  'Skill gaps for a career, ordered by largest gap first. SECURITY INVOKER so RLS applies.';


-- =============================================================================
-- 13. Seed data
-- =============================================================================

insert into public.careers (slug, title, category, description) values
  ('software-developer', 'Software Developer', 'build',
   'Designs, builds, and maintains software systems and digital products.'),
  ('cybersecurity-analyst', 'Cybersecurity Analyst', 'build',
   'Protects systems, networks, and data from threats and vulnerabilities.'),
  ('data-analyst', 'Data Analyst', 'analyze',
   'Turns raw data into insight through analysis, visualization, and reporting.'),
  ('business-analyst', 'Business Analyst', 'analyze',
   'Bridges business needs and technical solutions through structured analysis.'),
  ('ui-ux-designer', 'UI/UX Designer', 'design',
   'Creates usable, accessible digital experiences through research and design.'),
  ('graphic-designer', 'Graphic Designer', 'design',
   'Communicates ideas visually through typography, layout, and imagery.'),
  ('content-strategist', 'Content Strategist', 'communicate',
   'Plans and produces content that reaches and resonates with target audiences.'),
  ('marketing-specialist', 'Marketing Specialist', 'communicate',
   'Promotes products and brands through research, campaigns, and channels.');

insert into public.skills (slug, name, category, description) values
  ('javascript', 'JavaScript', 'build', 'Core language of the web.'),
  ('typescript', 'TypeScript', 'build', 'Typed superset of JavaScript.'),
  ('sql', 'SQL', 'analyze', 'Querying and modeling relational data.'),
  ('data-analysis', 'Data Analysis', 'analyze', 'Finding patterns and drawing conclusions from data.'),
  ('statistics', 'Statistics', 'analyze', 'Reasoning about data and uncertainty.'),
  ('spreadsheets', 'Spreadsheets', 'analyze', 'Cleaning, structuring, and summarizing data.'),
  ('ui-design', 'UI Design', 'design', 'Interface layout, hierarchy, and visual design.'),
  ('user-research', 'User Research', 'design', 'Understanding users through interviews and testing.'),
  ('figma', 'Figma', 'design', 'Collaborative interface design and prototyping.'),
  ('visual-design', 'Visual Design', 'design', 'Color, type, and composition.'),
  ('writing', 'Writing', 'communicate', 'Clear, structured written communication.'),
  ('content-strategy', 'Content Strategy', 'communicate', 'Planning content around goals and audiences.'),
  ('seo', 'SEO', 'communicate', 'Improving discoverability in search results.'),
  ('social-media', 'Social Media', 'communicate', 'Creating and measuring content on social platforms.'),
  ('networking', 'Networking', 'build', 'Systems, protocols, and service communication.'),
  ('version-control', 'Version Control', 'build', 'Collaborating on code with Git.'),
  ('problem-solving', 'Problem Solving', 'analyze', 'Breaking down ambiguous problems.'),
  ('communication', 'Communication', 'communicate', 'Explaining and collaborating clearly.');

-- Career <-> skill requirements
insert into public.career_skills (career_id, skill_id, importance)
select c.id, s.id, v.importance
from (values
  -- Software Developer
  ('software-developer', 'javascript',       5),
  ('software-developer', 'typescript',       4),
  ('software-developer', 'sql',              3),
  ('software-developer', 'version-control',  4),
  ('software-developer', 'networking',       3),
  ('software-developer', 'problem-solving',  4),
  -- Cybersecurity Analyst
  ('cybersecurity-analyst', 'networking',      5),
  ('cybersecurity-analyst', 'problem-solving', 4),
  ('cybersecurity-analyst', 'communication',   3),
  ('data-analyst', 'sql',              5),
  ('data-analyst', 'data-analysis',   5),
  ('data-analyst', 'statistics',       4),
  ('data-analyst', 'spreadsheets',     3),
  ('business-analyst', 'sql',              3),
  ('business-analyst', 'data-analysis',   4),
  ('business-analyst', 'communication',    5),
  ('business-analyst', 'problem-solving', 4),
  ('ui-ux-designer', 'ui-design',        5),
  ('ui-ux-designer', 'user-research',   5),
  ('ui-ux-designer', 'figma',            4),
  ('ui-ux-designer', 'visual-design',    4),
  ('ui-ux-designer', 'communication',    3),
  ('graphic-designer', 'visual-design',   5),
  ('graphic-designer', 'figma',            4),
  ('graphic-designer', 'writing',         3),
  ('content-strategist', 'writing',         5),
  ('content-strategist', 'content-strategy',5),
  ('content-strategist', 'seo',            4),
  ('content-strategist', 'social-media',   3),
  ('marketing-specialist', 'content-strategy', 4),
  ('marketing-specialist', 'writing',        4),
  ('marketing-specialist', 'seo',           5),
  ('marketing-specialist', 'social-media',  5),
  ('marketing-specialist', 'data-analysis', 3),
  ('marketing-specialist', 'communication',  4)
) as v(career_slug, skill_slug, importance)
join public.careers c on c.slug = v.career_slug
join public.skills s on s.slug = v.skill_slug
on conflict do nothing;

-- Sample learning content: the JavaScript -> Functions example from the landing page
insert into public.learning_activities (skill_id, kind, title, position)
select s.id, v.kind::public.activity_kind, v.title, v.position
from (values
  ('javascript', 'concept',  'What is JavaScript?',            1),
  ('javascript', 'concept',  'Variables and types',            2),
  ('javascript', 'example',  'Declaring your first variable',  3),
  ('javascript', 'concept',  'Functions',                     4),
  ('javascript', 'example',  'Writing your first function',    5),
  ('javascript', 'practice', 'Practice: build a tip calculator', 6)
) as v(skill_slug, kind, title, position)
join public.skills s on s.slug = v.skill_slug;

insert into public.challenges (skill_id, title, description, rubric, position)
select s.id, v.title, v.description, v.rubric::jsonb, v.position
from (values
  ('javascript', 'Build a tip calculator',
   'Implement a function that splits a bill and applies a tip percentage.',
   '[{"criterion":"Correct calculation","points":40},{"criterion":"Edge cases handled","points":30},{"criterion":"Readable naming","points":30}]',
   1),
  ('javascript', 'Convert temperature units',
   'Write functions that convert between Celsius and Fahrenheit.',
   '[{"criterion":"Correct conversion","points":50},{"criterion":"Uses both functions","points":30},{"criterion":"Clear code","points":20}]',
   2)
) as v(skill_slug, title, description, rubric, position)
join public.skills s on s.slug = v.skill_slug;



-- ############################################################################
-- ############################################################################
-- ##  PART 2 of 2  —  MIGRATION 20260102000000_roadmaps_onboarding_context
-- ##  Onboarding, resume, explainable matching, RPG roadmaps, resources
-- ############################################################################
-- ############################################################################
-- =============================================================================
-- Ka-Lakbay — Migration 2: Onboarding, Context, RPG Roadmaps, Resources
-- =============================================================================
-- Extends 20260101000000_initial_schema.sql. Purely additive: no DROP, no
-- destructive column changes. Safe to run against a database that already has
-- the initial schema applied.
--
-- Architectural intent is documented inline. Section numbers follow the layout
-- requested in the product spec.
-- =============================================================================


-- =============================================================================
-- 2. Enumerated domains (additive)
-- =============================================================================

-- AI onboarding flow. A student may resume or abandon a session.
-- Rerun-safe: the enum may already exist from an earlier run of this file.
do $enum$
begin
  create type public.onboarding_status as enum (
    'in_progress',
    'completed',
    'abandoned'
  );
exception
  when duplicate_object then null;
end
$enum$;

-- Question shape drives which answer inputs the UI renders. `open` covers free
-- text; `single_choice` / `multi_choice` render from `options`.
-- Rerun-safe: the enum may already exist from an earlier run of this file.
do $enum$
begin
  create type public.onboarding_question_type as enum (
    'open',
    'single_choice',
    'multi_choice',
    'boolean',
    'scale'
  );
exception
  when duplicate_object then null;
end
$enum$;

-- Resume parsing is a background job, so it has its own lifecycle.
-- Rerun-safe: the enum may already exist from an earlier run of this file.
do $enum$
begin
  create type public.parse_status as enum (
    'pending',
    'processing',
    'succeeded',
    'failed',
    'skipped'
  );
exception
  when duplicate_object then null;
end
$enum$;

-- Career marketplace signal. Coarse buckets on purpose: the product only needs
-- something to sort by, not a real compensation database.
-- Rerun-safe: the enum may already exist from an earlier run of this file.
do $enum$
begin
  create type public.market_demand as enum (
    'high',
    'medium',
    'low'
  );
exception
  when duplicate_object then null;
end
$enum$;

-- Node kinds on the RPG roadmap. A node is the smallest unit of "next step".
-- Rerun-safe: the enum may already exist from an earlier run of this file.
do $enum$
begin
  create type public.roadmap_node_type as enum (
    'skill',        -- teach/verify a single skill
    'milestone',    -- checkpoint grouping several skills
    'project',      -- build something real
    'proof',        -- must be demonstrated via a challenge to unlock the next tier
    'resource_only' -- curated reading/watch, no state change
  );
exception
  when duplicate_object then null;
end
$enum$;

-- Roadmap node progress. `locked` is intentionally NOT stored: lock state is
-- derived from dependencies + progress (see get_node_unlock_state()).
-- Rerun-safe: the enum may already exist from an earlier run of this file.
do $enum$
begin
  create type public.node_progress_status as enum (
    'not_started',
    'in_progress',
    'completed'
  );
exception
  when duplicate_object then null;
end
$enum$;

-- External educational material. Ka-Lakbay's own micro-lessons live in
-- learning_activities; these are things a student goes and reads/watches.
-- Rerun-safe: the enum may already exist from an earlier run of this file.
do $enum$
begin
  create type public.resource_type as enum (
    'course',
    'documentation',
    'tutorial',
    'article',
    'video',
    'project',
    'assessment'
  );
exception
  when duplicate_object then null;
end
$enum$;

-- How one career leads to another.
-- Rerun-safe: the enum may already exist from an earlier run of this file.
do $enum$
begin
  create type public.career_relationship_type as enum (
    'related',    -- adjacent, comparable
    'next_level', -- natural advancement from A to B
    'pivot',      -- lateral move reusing transferable skills
    'alternative' -- a different route to a similar outcome
  );
exception
  when duplicate_object then null;
end
$enum$;

-- Submission lifecycle. Students may only ever write 'submitted'; the
-- evaluation service advances it (see guard_submission_evaluation()).
-- Rerun-safe: the enum may already exist from an earlier run of this file.
do $enum$
begin
  create type public.submission_status as enum (
    'submitted',
    'evaluating',
    'passed',
    'needs_revision'
  );
exception
  when duplicate_object then null;
end
$enum$;


-- =============================================================================
-- 3. Profiles — richer context for the AI onboarding flow
-- =============================================================================

-- year_level is a controlled domain: the recommender buckets by seniority.
-- Rerun-safe: the enum may already exist from an earlier run of this file.
do $enum$
begin
  create type public.year_level as enum (
    'first_year',
    'second_year',
    'third_year',
    'fourth_year',
    'graduate',
    'working'
  );
exception
  when duplicate_object then null;
end
$enum$;

alter table public.profiles
  add column if not exists year_level public.year_level,
  -- Optional aspiration. Nullable by design: a student must be able to onboard
  -- with no target at all; "I'm Lost" is a first-class path on the landing page.
  add column if not exists career_aspiration text,
  add column if not exists career_aspiration_industry text,
  add column if not exists career_aspiration_source text
    check (career_aspiration_source is null
           or career_aspiration_source in ('student', 'inferred')),
  add column if not exists career_aspiration_set_at timestamptz,
  -- AI-derived context. Structured jsonb rather than more columns because the
  -- shape is model-driven and will change. Intended contents:
  --   { strengths: [], developing_areas: [], unassessed_areas: [],
  --     experience: [], knowledge: [], career_uncertainty: {...},
  --     evidence: [ {submission_id, skill_id, note} ] }
  -- Deliberately does NOT duplicate the resume; resumes.parsed_context owns that.
  add column if not exists ai_context jsonb not null default '{}'::jsonb,
  add column if not exists ai_context_generated_at timestamptz,
  -- Provider-agnostic. Records which model produced the block without
  -- committing the schema to any vendor (may be Gemini, Ollama, or something
  -- else later; treat as an opaque label).
  add column if not exists ai_context_model text,
  -- Set once onboarding finishes; gates the dashboard redirect.
  add column if not exists onboarding_completed boolean
    not null default false;

comment on column public.profiles.ai_context is
  'Structured AI-derived context: strengths, developing and unassessed areas, experience, knowledge, career uncertainty. Provider-agnostic.';
comment on column public.profiles.career_aspiration is
  'Optional target career/job. NULL means the student has not chosen one yet.';
comment on column public.profiles.resume_url is
  'Legacy pointer retained from migration 1. Prefer the resumes table, which tracks consent, parse status and parsed output.';

create index if not exists profiles_year_level_idx
  on public.profiles (year_level);

-- AI context is written server-side after evaluation, never by the student.
-- RLS on profiles was already enabled in migration 1; no re-enable needed here.

-- Supabase grants blanket table privileges to anon/authenticated, and a
-- table-level grant is NOT narrowed by a column-level revoke. So the revoke
-- must be at table level and the safe columns re-granted individually.
revoke update on public.profiles from authenticated, anon;
grant update (display_name, year_level, program, graduation_year, bio,
              interests, learning_preferences, resume_url,
              career_aspiration, career_aspiration_industry,
              career_aspiration_set_at, onboarding_completed_at)
  on public.profiles to authenticated;

-- AI context is server-written. confirm: no write column grants for these.
revoke update (ai_context, ai_context_generated_at, ai_context_model)
  on public.profiles from authenticated, anon;


-- =============================================================================
-- 4. Onboarding — session / question / response
-- =============================================================================
-- Purpose-built relational storage so onboarding answers are queryable
-- independently of the conversational log. `conversations`/`messages` stay the
-- narrative record; these tables are the structured one.

create table if not exists public.onboarding_sessions (
  id                uuid primary key default extensions.gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  status            public.onboarding_status not null default 'in_progress',
  -- Resume-in-place after an abandoned run. At most one open session per user.
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,
  -- High-level shape of the run, e.g. { used_resume: true, asked: 12 }.
  summary           jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint onboarding_sessions_user_fk foreign key (user_id)
    references auth.users (id) on delete cascade
);

comment on table public.onboarding_sessions is
  'One AI-assisted onboarding run. A student may have several; only one is open.';

create unique index if not exists onboarding_sessions_one_open_idx
  on public.onboarding_sessions (user_id)
  where status = 'in_progress';

-- "Get my current onboarding session" — the hot query on app resume.
create index if not exists onboarding_sessions_user_status_idx
  on public.onboarding_sessions (user_id, status, started_at desc);

create table if not exists public.onboarding_questions (
  id              uuid primary key default extensions.gen_random_uuid(),
  session_id      uuid not null references public.onboarding_sessions (id) on delete cascade,
  -- Stable key so a later question can reference the answer it branched on
  -- without depending on row order.
  key             text not null,
  type            public.onboarding_question_type not null default 'open',
  prompt          text not null check (length(btrim(prompt)) > 0),
  -- [{ "value": "frontend", "label": "Front-end" }] for *_choice types.
  options         jsonb not null default '[]'::jsonb,
  -- Contextual questioning: the model may generate later questions based on
  -- earlier answers. This records what it branched on.
  depends_on_key  text,
  -- True when generated during the conversation vs. authored in the knowledge base.
  is_generated    boolean not null default true,
  position        smallint not null default 0 check (position >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (session_id, key),
  constraint onboarding_questions_depends_fk foreign key (session_id, depends_on_key)
    references public.onboarding_questions (session_id, key) on delete cascade
);

comment on table public.onboarding_questions is
  'Questions asked during onboarding. depends_on_key expresses conditional branching.';

create index if not exists onboarding_questions_session_position_idx
  on public.onboarding_questions (session_id, position);
create index if not exists onboarding_questions_depends_idx
  on public.onboarding_questions (session_id, depends_on_key)
  where depends_on_key is not null;

create table if not exists public.onboarding_responses (
  id            uuid primary key default extensions.gen_random_uuid(),
  session_id    uuid not null references public.onboarding_sessions (id) on delete cascade,
  question_id   uuid not null references public.onboarding_questions (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  -- The answer rendered back to the student.
  answer        text,
  -- Machine-readable payload for non-text answers, e.g.
  -- { "selected": ["frontend"], "value": 4 } for multi_choice / scale.
  answer_data   jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- One answer per question; re-answering overwrites.
  unique (session_id, question_id)
);

comment on table public.onboarding_responses is
  'Student answers. user_id is denormalized so RLS never needs a join.';

create index if not exists onboarding_responses_session_idx
  on public.onboarding_responses (session_id, created_at);
create index if not exists onboarding_responses_user_idx
  on public.onboarding_responses (user_id, created_at desc);
-- Serves get_onboarding_context() and any "answers grouped by key" read.
create index if not exists onboarding_responses_question_idx
  on public.onboarding_responses (question_id);

-- session_id, question_id and user_id are three independent columns, and the
-- RLS policy only checks that user_id owns session_id. Without this, a student
-- could file a response against a question from someone else's session and have
-- it read back inside their own context bundle. All three must agree.
create or replace function public.guard_response_session_question()
returns trigger
language plpgsql
as $$
declare v_session_user uuid;
begin
  select s.user_id into v_session_user
  from public.onboarding_sessions s
  where s.id = new.session_id;

  if v_session_user is null then
    raise exception 'Onboarding session % does not exist', new.session_id;
  end if;

  if v_session_user <> new.user_id then
    raise exception 'Session % does not belong to this student', new.session_id;
  end if;

  if not exists (
    select 1 from public.onboarding_questions q
    where q.id = new.question_id and q.session_id = new.session_id
  ) then
    raise exception 'Question % does not belong to session %',
      new.question_id, new.session_id;
  end if;

  return new;
end;
$$;

drop trigger if exists onboarding_responses_session_question on public.onboarding_responses;
create trigger onboarding_responses_session_question
  before insert or update on public.onboarding_responses
  for each row execute function public.guard_response_session_question();

do $$
declare t text;
begin
  foreach t in array array['onboarding_sessions', 'onboarding_questions', 'onboarding_responses']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I '
      'for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t);
  end loop;
end $$;


-- =============================================================================
-- 5. Resume — metadata + consent + parsed context
-- =============================================================================
-- Deliberately separate from profiles so a student can upload several, revoke
-- consent, and retry a failed parse without touching the profile row.

create table if not exists public.resumes (
  id             uuid primary key default extensions.gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  -- Path within a private Supabase Storage bucket. Never a public URL: the
  -- file contains personal data and must be served via a signed URL.
  storage_path   text not null,
  original_filename text not null,
  mime_type      text not null
    check (mime_type in ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  byte_size      integer check (byte_size > 0),
  -- Consent is recorded before parsing and is revocable.
  consent_given  boolean not null default false,
  consented_at   timestamptz,
  uploaded_at    timestamptz not null default now(),
  parse_status   public.parse_status not null default 'pending',
  parsed_at      timestamptz,
  -- { summary, skills: [], experience: [], education: [], projects: [] }
  -- Produced by whichever AI provider is configured at the time.
  parsed_context jsonb,
  parsed_model   text,
  parse_error    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.resumes is
  'Optional resume upload. Parsed output is stored once here and referenced by profiles.ai_context.evidence rather than duplicated.';

-- One active (non-revoked) resume per student.
create unique index if not exists resumes_one_active_idx
  on public.resumes (user_id)
  where consent_given;

create index if not exists resumes_user_uploaded_idx
  on public.resumes (user_id, uploaded_at desc);
create index if not exists resumes_parse_status_idx
  on public.resumes (parse_status)
  where parse_status in ('pending', 'processing', 'failed');

drop trigger if exists resumes_set_updated_at on public.resumes;
create trigger resumes_set_updated_at
  before update on public.resumes
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 6. Careers — metadata for dashboard filtering and sorting
-- =============================================================================

alter table public.careers
  add column if not exists role_description text,
  add column if not exists median_compensation integer
    check (median_compensation is null or median_compensation > 0),
  add column if not exists compensation_currency text
    check (compensation_currency is null or compensation_currency ~ '^[A-Z]{3}$'),
  add column if not exists compensation_period text
    check (compensation_period is null
           or compensation_period in ('hourly', 'monthly', 'annual')),
  add column if not exists market_demand public.market_demand,
  -- Rough months-to-job-ready for someone starting from the career's roadmap root.
  add column if not exists learning_effort_months smallint
    check (learning_effort_months between 1 and 120),
  -- Every seeded figure is illustrative, not sourced. The UI must label these
  -- as estimates so students are not misled.
  add column if not exists is_sample_data boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

comment on column public.careers.is_sample_data is
  'True for seeded illustrative figures (compensation, demand, effort). Set false only when backed by a real data source.';

-- Dashboard sort paths: "highest salary", "fastest learning curve".
create index if not exists careers_market_demand_idx
  on public.careers (market_demand);
create index if not exists careers_learning_effort_idx
  on public.careers (learning_effort_months);
create index if not exists careers_category_demand_idx
  on public.careers (category, market_demand);

drop trigger if exists careers_set_updated_at on public.careers;
create trigger careers_set_updated_at
  before update on public.careers
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 9. Career relationships — related / next level / pivot
-- =============================================================================
-- Direction matters: (software-developer -> next_level -> senior engineer).
-- Both endpoints must be existing careers; no new career types are introduced.

create table if not exists public.career_relationships (
  id            uuid primary key default extensions.gen_random_uuid(),
  from_career_id uuid not null references public.careers (id) on delete cascade,
  to_career_id   uuid not null references public.careers (id) on delete cascade,
  type           public.career_relationship_type not null,
  -- Why this move exists, shown as the "next career paths" copy.
  rationale      text,
  -- Overlapping skills power the "pivot" suggestions.
  transferable_skills jsonb not null default '[]'::jsonb,
  position       smallint not null default 0 check (position >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (from_career_id, to_career_id, type),
  constraint career_relationships_no_self check (from_career_id <> to_career_id)
);

comment on table public.career_relationships is
  'Directed graph over the existing 8 careers: related / next_level / pivot / alternative.';

-- "Show me where this career can go"
create index if not exists career_relationships_from_idx
  on public.career_relationships (from_career_id, type);
-- "What can lead here" — powers reverse recommendations on the career page.
create index if not exists career_relationships_to_idx
  on public.career_relationships (to_career_id, type);

drop trigger if exists career_relationships_set_updated_at on public.career_relationships;
create trigger career_relationships_set_updated_at
  before update on public.career_relationships
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 10/11. Career roadmaps — RPG skill trees
-- =============================================================================
-- SOURCE OF TRUTH DECISION
-- ---------------------------
-- `roadmap_nodes` and `roadmap_node_dependencies` are AUTHORITATIVE.
-- A node can carry a skill reference and is depended on by other nodes, so it is
-- a real entity with referential integrity, not a value inside a blob.
--
-- `career_roadmaps.definition` is a DERIVED CACHE. It exists because the product
-- requires the whole tree as one JSON object for rendering, and one row fetch
-- beats four joins. It is regenerated by refresh_roadmap_definition(); never
-- write it by hand. get_roadmap_definition() is the supported read path and
-- rebuilds JSON from the relational tables on demand.

create table if not exists public.career_roadmaps (
  id            uuid primary key default extensions.gen_random_uuid(),
  career_id     uuid not null references public.careers (id) on delete cascade,
  -- Versions let a career's tree be revised without breaking students who are
  -- mid-progress: progress rows point at a node, and nodes are never reused
  -- across versions.
  version       integer not null default 1 check (version > 0),
  title         text not null,
  description   text,
  is_published  boolean not null default false,
  definition    jsonb not null default '{"nodes":[],"edges":[],"resources":[]}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- One published roadmap per career version at a time.
  unique (career_id, version)
);

comment on table public.career_roadmaps is
  'RPG roadmap for a career. Nodes and edges in the relational tables are authoritative; definition jsonb is a derived cache for single-fetch rendering.';

create unique index if not exists career_roadmaps_one_published_idx
  on public.career_roadmaps (career_id)
  where is_published;

create index if not exists career_roadmaps_career_version_idx
  on public.career_roadmaps (career_id, version desc);

drop trigger if exists career_roadmaps_set_updated_at on public.career_roadmaps;
create trigger career_roadmaps_set_updated_at
  before update on public.career_roadmaps
  for each row execute function public.set_updated_at();

create table if not exists public.roadmap_nodes (
  id            uuid primary key default extensions.gen_random_uuid(),
  roadmap_id    uuid not null references public.career_roadmaps (id) on delete cascade,
  -- Stable, human-readable identity that survives edits. Used by seed data,
  -- imports, and progress reconciliation across roadmap versions.
  key           text not null,
  -- Nullable: a 'project' or 'milestone' node is not about one skill.
  skill_id      uuid references public.skills (id) on delete set null,
  type          public.roadmap_node_type not null default 'skill',
  title         text not null check (length(btrim(title)) > 0),
  description   text,
  -- Render hint for the tree canvas, e.g. { "x": 0, "y": 2, "tier": 1 }.
  -- Purely presentational; the layout engine may ignore it.
  position      jsonb not null default '{}'::jsonb,
  -- Additional unlock rules beyond dependencies. Dependencies remain the primary
  -- mechanism; these cover the cases they cannot express:
  --   { "requires_evaluation": true }  needs a passed submission on challenge_id
  --   { "min_score": 70 }              that submission must score at least this
  -- get_node_unlock_state() evaluates both; unknown keys are ignored.
  unlock_conditions jsonb not null default '{}'::jsonb,
  -- Real relationship for proof/project nodes: the challenge that satisfies this
  -- node. A genuine FK rather than a value buried in metadata, so the unlock
  -- check and the evaluator can join on it.
  challenge_id    uuid references public.challenges (id) on delete set null,
  -- Node-local extras that need no referential integrity (duration estimate,
  -- provider hints).
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (roadmap_id, key)
);

comment on table public.roadmap_nodes is
  'A single step on the skill tree: a skill, milestone, project, or proof gate. Authoritative source for roadmap structure.';

create index if not exists roadmap_nodes_roadmap_idx
  on public.roadmap_nodes (roadmap_id);
-- "Which nodes cover this skill" — powers the reverse skill->tree view.
create index if not exists roadmap_nodes_skill_idx
  on public.roadmap_nodes (skill_id)
  where skill_id is not null;
-- Proof nodes resolve their unlock condition through this.
create index if not exists roadmap_nodes_challenge_idx
  on public.roadmap_nodes (challenge_id)
  where challenge_id is not null;

-- A challenge belongs to exactly one skill, so a node that both names a skill
-- and a challenge must name the skill that challenge is written against.
-- Otherwise get_node_unlock_state() could check the wrong skill's proof.
-- CHECK cannot contain a subquery, so this is a trigger instead.
create or replace function public.guard_node_challenge_skill()
returns trigger
language plpgsql
as $$
begin
  if new.challenge_id is not null and new.skill_id is not null then
    if not exists (
      select 1 from public.challenges c
      where c.id = new.challenge_id and c.skill_id = new.skill_id
    ) then
      raise exception 'Challenge % is not written against skill %', new.challenge_id, new.skill_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists roadmap_nodes_challenge_skill on public.roadmap_nodes;
create trigger roadmap_nodes_challenge_skill
  before insert or update on public.roadmap_nodes
  for each row execute function public.guard_node_challenge_skill();

drop trigger if exists roadmap_nodes_set_updated_at on public.roadmap_nodes;
create trigger roadmap_nodes_set_updated_at
  before update on public.roadmap_nodes
  for each row execute function public.set_updated_at();

-- Edge list. A node may depend on several prerequisites (AND semantics) and may
-- be a prerequisite for several nodes.
create table if not exists public.roadmap_node_dependencies (
  node_id          uuid not null references public.roadmap_nodes (id) on delete cascade,
  depends_on_node_id uuid not null references public.roadmap_nodes (id) on delete cascade,
  position         smallint not null default 0 check (position >= 0),
  created_at       timestamptz not null default now(),
  primary key (node_id, depends_on_node_id),
  constraint roadmap_node_dependencies_no_self check (node_id <> depends_on_node_id)
);

comment on table public.roadmap_node_dependencies is
  'Prerequisite edges. A node is unlocked once all its depends_on nodes are completed.';

-- "What must I finish first?"
create index if not exists roadmap_node_dependencies_depends_idx
  on public.roadmap_node_dependencies (depends_on_node_id);

-- Guarantee both endpoints belong to the same roadmap. A cheap trigger beats
-- repeating the roadmap join on every insert.
create or replace function public.guard_dependency_same_roadmap()
returns trigger
language plpgsql
as $$
declare v_roadmap uuid;
begin
  select roadmap_id into v_roadmap from public.roadmap_nodes where id = new.node_id;
  if not exists (
    select 1 from public.roadmap_nodes
    where id = new.depends_on_node_id and roadmap_id = v_roadmap
  ) then
    raise exception 'Prerequisite node % does not belong to roadmap %',
      new.depends_on_node_id, v_roadmap;
  end if;
  return new;
end;
$$;

drop trigger if exists roadmap_node_dependencies_same_roadmap on public.roadmap_node_dependencies;
create trigger roadmap_node_dependencies_same_roadmap
  before insert or update on public.roadmap_node_dependencies
  for each row execute function public.guard_dependency_same_roadmap();

-- Reject cycles, so unlock computation can never recurse forever.
create or replace function public.guard_no_dependency_cycle()
returns trigger
language plpgsql
as $$
declare v_cycle boolean;
begin
  -- Walk upstream from the new prerequisite; if we reach the dependent node
  -- again, the edge would close a loop.
  with recursive upstream (id) as (
    select new.depends_on_node_id
    union
    select d.depends_on_node_id
    from public.roadmap_node_dependencies d
    join upstream u on d.node_id = u.id
  )
  select exists (select 1 from upstream where id = new.node_id)
    into v_cycle;

  if v_cycle then
    raise exception 'Dependency from % to % would create a cycle',
      new.node_id, new.depends_on_node_id;
  end if;
  return new;
end;
$$;

drop trigger if exists roadmap_node_dependencies_no_cycle on public.roadmap_node_dependencies;
create trigger roadmap_node_dependencies_no_cycle
  before insert or update on public.roadmap_node_dependencies
  for each row execute function public.guard_no_dependency_cycle();


-- =============================================================================
-- 12. User roadmap progress
-- =============================================================================
-- Only records real student action. Lock/unlock state is derived in
-- get_node_unlock_state() rather than stored, so it cannot drift out of sync
-- when a prerequisite is added to the tree later.

create table if not exists public.user_roadmap_progress (
  user_id      uuid not null references auth.users (id) on delete cascade,
  roadmap_id   uuid not null references public.career_roadmaps (id) on delete cascade,
  node_id      uuid not null references public.roadmap_nodes (id) on delete cascade,
  status       public.node_progress_status not null default 'not_started',
  started_at   timestamptz,
  completed_at timestamptz,
  -- Opaque label of what marked it complete, e.g. 'evaluation' | 'manual'.
  -- Lets the UI distinguish a proven node from a self-marked one.
  completion_source text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, node_id),
  unique (user_id, roadmap_id, node_id),
  constraint user_roadmap_progress_times check (
    (completed_at is null or started_at is not null)
    and (status = 'completed') = (completed_at is not null)
  )
);

-- roadmap_id is derivable from node_id, so storing it risks the two disagreeing.
-- get_node_unlock_state() filters on roadmap_id, so a stale copy would silently
-- hide a student's progress.
create or replace function public.guard_progress_node_roadmap()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.roadmap_nodes n
    where n.id = new.node_id and n.roadmap_id = new.roadmap_id
  ) then
    raise exception 'Node % does not belong to roadmap %', new.node_id, new.roadmap_id;
  end if;
  return new;
end;
$$;

drop trigger if exists user_roadmap_progress_node_roadmap on public.user_roadmap_progress;
create trigger user_roadmap_progress_node_roadmap
  before insert or update on public.user_roadmap_progress
  for each row execute function public.guard_progress_node_roadmap();

comment on table public.user_roadmap_progress is
  'Per-node progress. Locked state is derived from dependencies, never stored.';

create index if not exists user_roadmap_progress_user_roadmap_status_idx
  on public.user_roadmap_progress (user_id, roadmap_id, status);
create index if not exists user_roadmap_progress_node_idx
  on public.user_roadmap_progress (node_id);
create index if not exists user_roadmap_progress_user_completed_idx
  on public.user_roadmap_progress (user_id, completed_at desc)
  where completed_at is not null;

drop trigger if exists user_roadmap_progress_set_updated_at on public.user_roadmap_progress;
create trigger user_roadmap_progress_set_updated_at
  before update on public.user_roadmap_progress
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 13/14. Learning resources — the roadmap resource drawer
-- =============================================================================
-- Distinct from learning_activities: those are Ka-Lakbay's own micro-lessons
-- with progress tracking, these are external references. One record can serve
-- several nodes through roadmap_node_resources, so nothing is duplicated.

create table if not exists public.learning_resources (
  id           uuid primary key default extensions.gen_random_uuid(),
  -- Every resource supports at least one skill; that is what makes it findable
  -- from the student's profile even before a roadmap is chosen.
  skill_id     uuid not null references public.skills (id) on delete cascade,
  title        text not null check (length(btrim(title)) > 0),
  description  text,
  type         public.resource_type not null,
  provider     text,
  url          text not null check (url ~ '^https?://'),
  duration_minutes integer check (duration_minutes > 0),
  difficulty   smallint check (difficulty between 1 and 5),
  is_sample_data boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.learning_resources is
  'External educational material (courses, docs, tutorials, projects). Reference data: readable by students, writable only server-side.';

-- Resource drawer for a skill.
create index if not exists learning_resources_skill_idx
  on public.learning_resources (skill_id);
create index if not exists learning_resources_type_idx
  on public.learning_resources (type);
create index if not exists learning_resources_skill_type_idx
  on public.learning_resources (skill_id, type);

drop trigger if exists learning_resources_set_updated_at on public.learning_resources;
create trigger learning_resources_set_updated_at
  before update on public.learning_resources
  for each row execute function public.set_updated_at();

create table if not exists public.roadmap_node_resources (
  node_id     uuid not null references public.roadmap_nodes (id) on delete cascade,
  resource_id uuid not null references public.learning_resources (id) on delete cascade,
  -- Why this resource belongs on this node, shown in the drawer.
  note        text,
  position    smallint not null default 0 check (position >= 0),
  created_at  timestamptz not null default now(),
  primary key (node_id, resource_id)
);

comment on table public.roadmap_node_resources is
  'Many-to-many join: one resource can appear on several roadmap nodes.';

-- "Resources for this node", the query behind the drawer.
create index if not exists roadmap_node_resources_resource_idx
  on public.roadmap_node_resources (resource_id);


-- =============================================================================
-- 16/18. Submissions — attempt history and evaluation integrity
-- =============================================================================

-- Migration 1 modelled a single row per challenge. Students should be able to
-- retry, and every attempt keeps its own evaluation. Rather than replace the
-- table, add an attempt number and re-point status at a real enum.
alter table public.challenge_submissions
  add column if not exists attempt_number smallint not null default 1
    check (attempt_number > 0),
  add column if not exists model_identifier text,
  add column if not exists generation_metadata jsonb not null default '{}'::jsonb;

-- Move the default off the text-typed status column before its type changes.
-- Postgres cannot cast a text default to an enum implicitly.
alter table public.challenge_submissions
  alter column status drop default;

comment on column public.challenge_submissions.model_identifier is
  'Opaque label of whichever model graded this attempt. Provider-agnostic.';

-- Sequencing: attempt 1, then 2, then 3... per student per challenge.
create unique index if not exists challenge_submissions_attempt_idx
  on public.challenge_submissions (user_id, challenge_id, attempt_number);

-- Latest attempt for a challenge, for the "your best result" view.
create index if not exists challenge_submissions_latest_idx
  on public.challenge_submissions (user_id, challenge_id, attempt_number desc)
  include (status, score, created_at);

-- status was a CHECK on text in migration 1. Swap it for the enum without
-- dropping the column, so existing rows and the index above survive.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'challenge_submissions'
      and column_name = 'status' and data_type = 'text'
  ) then
    execute 'alter table public.challenge_submissions '
         || '  drop constraint challenge_submissions_status_check';
    execute 'alter table public.challenge_submissions '
         || '  alter column status type public.submission_status '
         || '  using status::public.submission_status';
    execute 'alter table public.challenge_submissions '
         || '  alter column status set default ''submitted''::public.submission_status';
  end if;
end $$;

comment on table public.challenge_submissions is
  'One row per attempt. Multiple attempts per challenge are retained; an older evaluation is never overwritten by a newer one.';


-- =============================================================================
-- 17. Career exploration — explainable matching + saved careers
-- =============================================================================

alter table public.career_exploration
  add column if not exists match_explanation text,
  add column if not exists match_factors jsonb not null default '[]'::jsonb,
  add column if not exists generated_at timestamptz,
  add column if not exists model_identifier text,
  -- Bookmark lives here rather than in a separate table: a student either has a
  -- scored match row or a plain saved row, and one row carries both.
  add column if not exists is_saved boolean not null default false,
  add column if not exists saved_at timestamptz;

comment on column public.career_exploration.match_factors is
  'Why this career was surfaced, as a JSON array of factors, e.g. [{"kind":"interest","detail":"wants to build software"},{"kind":"skill","detail":"already knows JavaScript","weight":0.4}]';
comment on column public.career_exploration.is_saved is
  'Bookmark. Saved rows may have a NULL fit_score for a saved-but-unexplored career.';

create index if not exists career_exploration_saved_idx
  on public.career_exploration (user_id, saved_at desc)
  where is_saved;
-- "Recommended careers, best first" — only rows the recommender has scored.
create index if not exists career_exploration_user_scored_idx
  on public.career_exploration (user_id, fit_score desc)
  where fit_score is not null;


-- =============================================================================
-- 19. RLS — new tables
-- =============================================================================

alter table public.onboarding_sessions  enable row level security;
alter table public.onboarding_questions enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.resumes              enable row level security;
alter table public.career_relationships  enable row level security;
alter table public.career_roadmaps      enable row level security;
alter table public.roadmap_nodes        enable row level security;
alter table public.roadmap_node_dependencies enable row level security;
alter table public.roadmap_node_resources     enable row level security;
alter table public.user_roadmap_progress     enable row level security;
alter table public.learning_resources        enable row level security;

-- ---- onboarding_sessions: owner only.
-- Questions and responses carry no user_id of their own (a session owns them),
-- so their policies resolve ownership through the parent session.
drop policy if exists "onboarding_sessions_select_own" on public.onboarding_sessions;
create policy "onboarding_sessions_select_own" on public.onboarding_sessions
  for select using (public.is_owner(user_id));
drop policy if exists "onboarding_sessions_insert_own" on public.onboarding_sessions;
create policy "onboarding_sessions_insert_own" on public.onboarding_sessions
  for insert with check (public.is_owner(user_id));
drop policy if exists "onboarding_sessions_update_own" on public.onboarding_sessions;
create policy "onboarding_sessions_update_own" on public.onboarding_sessions
  for update using (public.is_owner(user_id)) with check (public.is_owner(user_id));
drop policy if exists "onboarding_sessions_delete_own" on public.onboarding_sessions;
create policy "onboarding_sessions_delete_own" on public.onboarding_sessions
  for delete using (public.is_owner(user_id));

-- Questions are authored by the AI, not the student: insert is server-side only.
-- Scoped to the owner's sessions.
drop policy if exists "onboarding_questions_select_own" on public.onboarding_questions;
create policy "onboarding_questions_select_own" on public.onboarding_questions
  for select using (
    exists (
      select 1 from public.onboarding_sessions s
      where s.id = session_id and public.is_owner(s.user_id)
    )
  );

drop policy if exists "onboarding_responses_select_own" on public.onboarding_responses;
create policy "onboarding_responses_select_own" on public.onboarding_responses
  for select using (public.is_owner(user_id));
drop policy if exists "onboarding_responses_insert_own" on public.onboarding_responses;
create policy "onboarding_responses_insert_own" on public.onboarding_responses
  for insert with check (
    public.is_owner(user_id)
    and exists (
      select 1 from public.onboarding_sessions s
      where s.id = session_id and public.is_owner(s.user_id)
    )
  );
drop policy if exists "onboarding_responses_update_own" on public.onboarding_responses;
create policy "onboarding_responses_update_own" on public.onboarding_responses
  for update using (public.is_owner(user_id)) with check (public.is_owner(user_id));

-- ---- resumes: owner only. parsed_context is written by the parse worker.
drop policy if exists "resumes_select_own" on public.resumes;
create policy "resumes_select_own" on public.resumes
  for select using (public.is_owner(user_id));
drop policy if exists "resumes_insert_own" on public.resumes;
create policy "resumes_insert_own" on public.resumes
  for insert with check (public.is_owner(user_id));
drop policy if exists "resumes_update_own" on public.resumes;
create policy "resumes_update_own" on public.resumes
  for update using (public.is_owner(user_id)) with check (public.is_owner(user_id));
drop policy if exists "resumes_delete_own" on public.resumes;
create policy "resumes_delete_own" on public.resumes
  for delete using (public.is_owner(user_id));

-- ---- reference data: students read, never write.
-- Roadmaps are versioned, and only one version per career is published. Draft
-- versions are authoring work in progress and must not leak to students, so the
-- roadmap and everything hanging off it filter on is_published. Each child
-- table has to join up to its roadmap rather than trusting its own parent id.
drop policy if exists "career_relationships_read_all" on public.career_relationships;
create policy "career_relationships_read_all" on public.career_relationships
  for select using (true);

drop policy if exists "career_roadmaps_read_all" on public.career_roadmaps;
drop policy if exists "career_roadmaps_read_published" on public.career_roadmaps;
create policy "career_roadmaps_read_published" on public.career_roadmaps
  for select using (is_published);

drop policy if exists "roadmap_nodes_read_all" on public.roadmap_nodes;
drop policy if exists "roadmap_nodes_read_published" on public.roadmap_nodes;
create policy "roadmap_nodes_read_published" on public.roadmap_nodes
  for select using (
    exists (
      select 1 from public.career_roadmaps r
      where r.id = roadmap_id and r.is_published
    )
  );

drop policy if exists "roadmap_node_dependencies_read_all" on public.roadmap_node_dependencies;
drop policy if exists "roadmap_node_dependencies_read_published" on public.roadmap_node_dependencies;
create policy "roadmap_node_dependencies_read_published" on public.roadmap_node_dependencies
  for select using (
    exists (
      select 1 from public.roadmap_nodes n
      join public.career_roadmaps r on r.id = n.roadmap_id and r.is_published
      where n.id = node_id
    )
  );

drop policy if exists "roadmap_node_resources_read_all" on public.roadmap_node_resources;
drop policy if exists "roadmap_node_resources_read_published" on public.roadmap_node_resources;
create policy "roadmap_node_resources_read_published" on public.roadmap_node_resources
  for select using (
    exists (
      select 1 from public.roadmap_nodes n
      join public.career_roadmaps r on r.id = n.roadmap_id and r.is_published
      where n.id = node_id
    )
  );

drop policy if exists "learning_resources_read_all" on public.learning_resources;
create policy "learning_resources_read_all" on public.learning_resources
  for select using (true);

-- ---- roadmap progress: owner only.
drop policy if exists "user_roadmap_progress_select_own" on public.user_roadmap_progress;
create policy "user_roadmap_progress_select_own" on public.user_roadmap_progress
  for select using (public.is_owner(user_id));
drop policy if exists "user_roadmap_progress_insert_own" on public.user_roadmap_progress;
create policy "user_roadmap_progress_insert_own" on public.user_roadmap_progress
  for insert with check (public.is_owner(user_id));
drop policy if exists "user_roadmap_progress_update_own" on public.user_roadmap_progress;
create policy "user_roadmap_progress_update_own" on public.user_roadmap_progress
  for update using (public.is_owner(user_id)) with check (public.is_owner(user_id));
drop policy if exists "user_roadmap_progress_delete_own" on public.user_roadmap_progress;
create policy "user_roadmap_progress_delete_own" on public.user_roadmap_progress
  for delete using (public.is_owner(user_id));


-- =============================================================================
-- 17 (cont). Skill-state integrity — proof, not self-declaration
-- =============================================================================
-- Product principle: track what a student can DEMONSTRATE. If a client could
-- simply write state='strong', the whole proof model is meaningless.
--
-- Two layers, neither of which weakens RLS:
--   1. Column-level privileges. The student may still see and insert their own
--      rows, but cannot write the promoted columns.
--   2. A trigger that rejects promotion unless the request comes from the
--      service role, as a defence in depth for other write paths.

-- Table-level revoke is what actually takes effect; column grants then re-open
-- only the fields a student legitimately owns. The triggers below are the
-- second layer and catch non-REST write paths regardless of grants.
revoke update on public.user_skills from authenticated, anon;
-- No column grants: every meaningful field on this table is server-written.
-- The student may insert a 'started' row and read their state back, nothing more.

-- INSERT needs the same treatment as UPDATE. Revoking UPDATE alone leaves the
-- hole open in the other direction: a client could skip updates entirely and
-- INSERT its own row already carrying state='strong'. So both are revoked, the
-- insert path is narrowed to the columns a student legitimately supplies, and a
-- BEFORE INSERT trigger resets the promoted columns to their defaults.
revoke insert, update on public.user_skills from authenticated, anon;
grant insert (user_id, skill_id) on public.user_skills to authenticated;

revoke insert, update on public.challenge_submissions from authenticated, anon;
grant insert (user_id, challenge_id, attempt_number, content, repo_url)
  on public.challenge_submissions to authenticated;
grant update (content, repo_url) on public.challenge_submissions to authenticated;

revoke insert, update on public.career_exploration from authenticated, anon;
-- A student may bookmark a career, or claim one as a target during onboarding.
-- Everything the recommender derives from their profile stays server-written.
grant insert (user_id, career_id, is_saved, saved_at, notes)
  on public.career_exploration to authenticated;
grant update (is_saved, saved_at, notes) on public.career_exploration to authenticated;

revoke insert, update on public.resumes from authenticated, anon;
grant insert (user_id, storage_path, original_filename, mime_type, byte_size,
              consent_given, consented_at)
  on public.resumes to authenticated;
grant update (consent_given, consented_at, original_filename)
  on public.resumes to authenticated;

-- Completion of onboarding is a server decision: it requires the AI context and
-- the resume parse to have been processed. The student must not be able to flip
-- it and skip straight to a dashboard built on unprocessed input.
revoke update (onboarding_completed, onboarding_completed_at)
  on public.profiles from authenticated, anon;

create or replace function public.guard_skill_state_promotion()
returns trigger
language plpgsql
as $$
begin
  -- On INSERT there is no prior row to diff against, so the promoted columns
  -- are forced back to their starting values instead of compared.
  if tg_op = 'INSERT' then
    if coalesce(auth.role(), '') <> 'service_role' then
      new.state := 'started';
      new.confidence := 0;
      new.demonstrated_at := null;
    end if;
    return new;
  end if;

  if new.state is distinct from old.state
     or new.confidence is distinct from old.confidence
     or new.demonstrated_at is distinct from old.demonstrated_at then
    if coalesce(auth.role(), '') <> 'service_role' then
      raise exception
        'Skill state is advanced by server-side evaluation only. Submit a challenge instead.';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.guard_skill_state_promotion() is
  'Blocks student clients from self-promoting skill state, on both INSERT and UPDATE. Promotion requires the service role.';

drop trigger if exists user_skills_guard_promotion on public.user_skills;
create trigger user_skills_guard_promotion
  before insert or update on public.user_skills
  for each row execute function public.guard_skill_state_promotion();

create or replace function public.guard_submission_evaluation()
returns trigger
language plpgsql
as $$
begin
  -- Same reasoning as skill state: an INSERT that already claims 'passed' with
  -- a score is the same forgery an UPDATE would be.
  if tg_op = 'INSERT' then
    if coalesce(auth.role(), '') <> 'service_role' then
      new.status := 'submitted';
      new.score := null;
      new.evaluation := null;
      new.evaluated_at := null;
      new.model_identifier := null;
      new.generation_metadata := '{}'::jsonb;
    end if;
    return new;
  end if;

  if new.status is distinct from old.status
     or new.score is distinct from old.score
     or new.evaluation is distinct from old.evaluation
     or new.evaluated_at is distinct from old.evaluated_at then
    if coalesce(auth.role(), '') <> 'service_role' then
      raise exception 'Evaluation results are written by the server, not the client.';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.guard_submission_evaluation() is
  'Forces new submissions to status=submitted with no result, and blocks result writes from clients.';

drop trigger if exists challenge_submissions_guard_evaluation on public.challenge_submissions;
create trigger challenge_submissions_guard_evaluation
  before insert or update on public.challenge_submissions
  for each row execute function public.guard_submission_evaluation();

-- AI-derived match fields. Same INSERT hole as the two above.
create or replace function public.guard_match_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(auth.role(), '') <> 'service_role' then
      new.fit_score := null;
      new.match_explanation := null;
      new.match_factors := '[]'::jsonb;
      new.generated_at := null;
      new.model_identifier := null;
    end if;
    return new;
  end if;

  if new.fit_score is distinct from old.fit_score
     or new.match_explanation is distinct from old.match_explanation
     or new.match_factors is distinct from old.match_factors
     or new.generated_at is distinct from old.generated_at
     or new.model_identifier is distinct from old.model_identifier then
    if coalesce(auth.role(), '') <> 'service_role' then
      raise exception 'Career match results are computed by the server, not the client.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists career_exploration_guard_match on public.career_exploration;
create trigger career_exploration_guard_match
  before insert or update on public.career_exploration
  for each row execute function public.guard_match_fields();

-- Resume parsing output is produced by a background worker.
create or replace function public.guard_resume_parse()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(auth.role(), '') <> 'service_role' then
      new.parse_status := 'pending';
      new.parsed_at := null;
      new.parsed_context := null;
      new.parsed_model := null;
      new.parse_error := null;
    end if;
    return new;
  end if;

  if new.parse_status is distinct from old.parse_status
     or new.parsed_at is distinct from old.parsed_at
     or new.parsed_context is distinct from old.parsed_context
     or new.parsed_model is distinct from old.parsed_model
     or new.parse_error is distinct from old.parse_error then
    if coalesce(auth.role(), '') <> 'service_role' then
      raise exception 'Resume parse results are written by the server, not the client.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists resumes_guard_parse on public.resumes;
create trigger resumes_guard_parse
  before insert or update on public.resumes
  for each row execute function public.guard_resume_parse();

-- Onboarding completion, plus the AI context block that depends on it.
create or replace function public.guard_onboarding_completion()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(auth.role(), '') <> 'service_role' then
      new.onboarding_completed := false;
      new.onboarding_completed_at := null;
      new.ai_context := '{}'::jsonb;
      new.ai_context_generated_at := null;
      new.ai_context_model := null;
    end if;
    return new;
  end if;

  if new.onboarding_completed is distinct from old.onboarding_completed
     or new.onboarding_completed_at is distinct from old.onboarding_completed_at
     or new.ai_context is distinct from old.ai_context
     or new.ai_context_generated_at is distinct from old.ai_context_generated_at
     or new.ai_context_model is distinct from old.ai_context_model then
    if coalesce(auth.role(), '') <> 'service_role' then
      raise exception
        'Onboarding completion and AI context are written by the server, not the client.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_onboarding on public.profiles;
create trigger profiles_guard_onboarding
  before insert or update on public.profiles
  for each row execute function public.guard_onboarding_completion();


-- =============================================================================
-- 20. Functions / RPC
-- =============================================================================

-- Rebuild the roadmap JSON from the authoritative relational tables. This is
-- the supported read path: one call returns nodes, edges, unlock conditions and
-- the resources attached to each node, which is exactly what the tree renderer
-- needs.
create or replace function public.build_roadmap_definition(p_roadmap_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'roadmap', jsonb_build_object(
      'id', r.id,
      'career_id', r.career_id,
      'version', r.version,
      'title', r.title,
      'description', r.description
    ),
    'nodes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'key', n.key,
          'title', n.title,
          'description', n.description,
          'type', n.type,
          'skill_id', n.skill_id,
          'challenge_id', n.challenge_id,
          'position', n.position,
          'unlock_conditions', n.unlock_conditions,
          'metadata', n.metadata,
          'resources', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', lr.id,
                'title', lr.title,
                'type', lr.type,
                'provider', lr.provider,
                'url', lr.url,
                'duration_minutes', lr.duration_minutes,
                'difficulty', lr.difficulty,
                'note', rnr.note
              ) order by rnr.position, lr.title
            )
            from public.roadmap_node_resources rnr
            join public.learning_resources lr on lr.id = rnr.resource_id
            where rnr.node_id = n.id
          ), '[]'::jsonb)
        ) order by n.key
      )
      from public.roadmap_nodes n
      where n.roadmap_id = r.id
    ), '[]'::jsonb),
    'edges', coalesce((
      select jsonb_agg(
        jsonb_build_object('node_id', d.node_id, 'depends_on_node_id', d.depends_on_node_id)
      )
      from public.roadmap_node_dependencies d
      join public.roadmap_nodes n on n.id = d.node_id
      where n.roadmap_id = r.id
    ), '[]'::jsonb)
  )
  from public.career_roadmaps r
  where r.id = p_roadmap_id;
$$;

comment on function public.build_roadmap_definition(uuid) is
  'Assembles roadmap JSON for one roadmap id. Internal building block; honours the published-only RLS policy.';

-- Student-facing read path. Only ever exposes the published roadmap.
create or replace function public.get_roadmap_definition(p_career_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select public.build_roadmap_definition(r.id)
  from public.career_roadmaps r
  where r.career_id = p_career_id and r.is_published;
$$;

comment on function public.get_roadmap_definition(uuid) is
  'Full roadmap JSON (nodes, edges, per-node resources) for a career''s published tree.';

-- Refresh the derived cache so a single-row read still works for clients that
-- want it. Run server-side after editing nodes or edges.
--
-- Takes a roadmap id, not a career id, and serialises exactly that roadmap. An
-- earlier version resolved the career and called get_roadmap_definition(), which
-- only ever returns the *published* tree: refreshing a draft would have silently
-- copied the published definition onto it.
create or replace function public.refresh_roadmap_definition(p_roadmap_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_definition jsonb;
begin
  -- SECURITY DEFINER bypasses the published-only RLS policy, so build the JSON
  -- here rather than through the invoker-facing helper.
  select public.build_roadmap_definition(p_roadmap_id) into v_definition;

  if v_definition is null then
    raise exception 'Roadmap % not found', p_roadmap_id;
  end if;

  update public.career_roadmaps
     set definition = v_definition
   where id = p_roadmap_id;

  return v_definition;
end;
$$;

comment on function public.refresh_roadmap_definition(uuid) is
  'Rebuilds career_roadmaps.definition from the relational node/edge tables.';

-- Unlock state for every node in a roadmap, derived from progress + edges.
-- Returns 'locked' | 'unlocked' | 'in_progress' | 'completed' so the client
-- never has to reconstruct the graph.
create or replace function public.get_node_unlock_state(p_roadmap_id uuid)
returns table (
  node_id uuid,
  node_key text,
  unlock_state text,
  status public.node_progress_status,
  completed_at timestamptz,
  -- Which prerequisite is outstanding, for UI copy like "Finish JavaScript Fundamentals first".
  blocked_by_key text,
  -- Set when a proof gate is unmet, e.g. 'requires_evaluation' or 'min_score'.
  blocked_reason text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with prereqs as (
    select d.node_id,
           count(*) as required,
           count(*) filter (where up.status = 'completed') as done,
           -- One outstanding prerequisite is enough for the UI to name.
           min(dn.key) filter (where up.status is distinct from 'completed') as blocking_key
    from public.roadmap_node_dependencies d
    join public.roadmap_nodes dn on dn.id = d.depends_on_node_id
    left join public.user_roadmap_progress up
      on up.node_id = d.depends_on_node_id
     and up.user_id = auth.uid()
    where dn.roadmap_id = p_roadmap_id
    group by d.node_id
  ),
  proof as (
    -- Best evaluated attempt on each node's challenge for this student.
    select n.id as node_id,
           max(cs.score) filter (where cs.status = 'passed') as passed_score
    from public.roadmap_nodes n
    left join public.challenge_submissions cs
      on cs.challenge_id = n.challenge_id
     and cs.user_id = auth.uid()
    where n.roadmap_id = p_roadmap_id
    group by n.id
  )
  select
    n.id,
    n.key,
    case
      -- Progress you have already earned is never revoked, even if the content
      -- behind it changed and the conditions no longer hold.
      when p.status = 'completed' then 'completed'
      -- Dependencies first: nothing else matters until these are met.
      when coalesce(pr.required, 0) > 0
       and coalesce(pr.done, 0) < pr.required then 'locked'
      -- Then the node's own unlock_conditions.
      when coalesce((n.unlock_conditions ->> 'requires_evaluation')::boolean, false)
       and prf.passed_score is null then 'locked'
      when (n.unlock_conditions ? 'min_score')
       and prf.passed_score is null then 'locked'
      when (n.unlock_conditions ? 'min_score')
       and prf.passed_score < (n.unlock_conditions ->> 'min_score')::smallint then 'locked'
      when p.status = 'in_progress' then 'in_progress'
      else 'unlocked'
    end::text,
    coalesce(p.status, 'not_started')::public.node_progress_status,
    p.completed_at,
    case
      when p.status = 'completed' then null
      when coalesce(pr.required, 0) > 0 and coalesce(pr.done, 0) < pr.required
        then pr.blocking_key
      else null
    end::text,
    case
      when p.status = 'completed' then null
      when coalesce(pr.required, 0) > 0 and coalesce(pr.done, 0) < pr.required then null
      when coalesce((n.unlock_conditions ->> 'requires_evaluation')::boolean, false)
       and prf.passed_score is null then 'requires_evaluation'
      when (n.unlock_conditions ? 'min_score')
       and prf.passed_score is null then 'min_score'
      when (n.unlock_conditions ? 'min_score')
       and prf.passed_score < (n.unlock_conditions ->> 'min_score')::smallint then 'min_score'
      else null
    end::text
  from public.roadmap_nodes n
  left join public.user_roadmap_progress p
    on p.node_id = n.id and p.user_id = auth.uid()
  left join prereqs pr on pr.node_id = n.id
  left join proof prf on prf.node_id = n.id
  where n.roadmap_id = p_roadmap_id
  order by n.key;
$$;

comment on function public.get_node_unlock_state(uuid) is
  'Derived locked/unlocked/in_progress/completed state per node, honouring both dependencies and unlock_conditions (requires_evaluation, min_score). Stored nowhere, so it cannot drift.';

-- Everything the AI needs for personalization, in one round trip. Replaces an
-- N+1 walk across sessions, responses, resume and skill state.
create or replace function public.get_onboarding_context()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'profile', (
      select to_jsonb(p) - 'ai_context' - 'resume_url'
      from public.profiles p where p.id = auth.uid()
    ),
    'ai_context', (
      select ai_context from public.profiles where id = auth.uid()
    ),
    'aspiration', (
      select jsonb_build_object(
        'career', career_aspiration,
        'industry', career_aspiration_industry,
        'source', career_aspiration_source
      )
      from public.profiles where id = auth.uid()
    ),
    'latest_session', (
      select to_jsonb(s) from public.onboarding_sessions s
      where s.user_id = auth.uid()
      order by s.started_at desc limit 1
    ),
    'responses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', q.key,
        'type', q.type,
        'prompt', q.prompt,
        'answer', r.answer,
        'answer_data', r.answer_data
      ))
      from public.onboarding_responses r
      join public.onboarding_questions q on q.id = r.question_id
      join public.onboarding_sessions s on s.id = r.session_id
      where s.user_id = auth.uid()
    ), '[]'::jsonb),
    'resume', (
      select jsonb_build_object(
        'id', id,
        'original_filename', original_filename,
        'parse_status', parse_status,
        'parsed_context', parsed_context
      )
      from public.resumes
      where user_id = auth.uid()
      order by uploaded_at desc limit 1
    ),
    'skills', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', sk.slug, 'name', sk.name,
        'state', us.state, 'confidence', us.confidence
      ))
      from public.user_skills us
      join public.skills sk on sk.id = us.skill_id
      where us.user_id = auth.uid()
    ), '[]'::jsonb)
  );
$$;

comment on function public.get_onboarding_context() is
  'Single-call personalization bundle: profile, aspiration, onboarding answers, resume parse, skill state.';

-- Career recommendations with their explanations, ready for the dashboard.
create or replace function public.get_recommended_careers()
returns table (
  career_id uuid,
  slug text,
  title text,
  category public.career_category,
  fit_score smallint,
  match_explanation text,
  match_factors jsonb,
  is_saved boolean,
  gap_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.slug,
    c.title,
    c.category,
    ce.fit_score,
    ce.match_explanation,
    ce.match_factors,
    ce.is_saved,
    -- Open skill gaps for this career: requirements not yet demonstrated.
    (
      select count(*)
      from public.career_skills cs
      left join public.user_skills us
        on us.skill_id = cs.skill_id and us.user_id = auth.uid()
      where cs.career_id = c.id
        and coalesce(us.state, 'started') not in ('demonstrated', 'strong')
    )
  from public.careers c
  left join public.career_exploration ce
    on ce.career_id = c.id and ce.user_id = auth.uid()
  where ce.fit_score is not null or ce.is_saved
  order by ce.fit_score desc nulls last, c.title;
$$;

comment on function public.get_recommended_careers() is
  'Dashboard list: scored recommendations plus saved careers, each with its explanation and gap count.';

-- Career detail: metadata, requirements, and where it can lead next.
create or replace function public.get_career_detail(p_career_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'career', (select to_jsonb(c) from public.careers c where c.id = p_career_id),
    'required_skills', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', s.slug, 'name', s.name,
        'importance', cs.importance,
        'state', coalesce(us.state, 'started'),
        'confidence', coalesce(us.confidence, 0)
      ) order by cs.importance desc, s.name)
      from public.career_skills cs
      join public.skills s on s.id = cs.skill_id
      left join public.user_skills us
        on us.skill_id = cs.skill_id and us.user_id = auth.uid()
      where cs.career_id = p_career_id
    ), '[]'::jsonb),
    'gaps', coalesce(
      (select jsonb_agg(to_jsonb(g)) from public.get_skill_gaps(p_career_id) g),
      '[]'::jsonb
    ),
    'paths', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', c2.slug, 'title', c2.title,
        'type', cr.type, 'rationale', cr.rationale
      ) order by cr.type, c2.title)
      from public.career_relationships cr
      join public.careers c2 on c2.id = cr.to_career_id
      where cr.from_career_id = p_career_id
    ), '[]'::jsonb),
    'roadmap', public.get_roadmap_definition(p_career_id),
    'saved', exists (
      select 1 from public.career_exploration ce
      where ce.user_id = auth.uid()
        and ce.career_id = p_career_id and ce.is_saved
    )
  );
$$;

comment on function public.get_career_detail(uuid) is
  'Career page payload: metadata, skills, gaps, next paths, roadmap JSON, saved state.';


-- =============================================================================
-- 21. Seed data — Software Developer demo path
-- =============================================================================
-- Extends migration 1's seed. Figures are illustrative and flagged
-- is_sample_data = true; the UI must present them as estimates.

update public.careers
   set role_description = case slug
       when 'software-developer' then
         'Design, build, test and maintain web applications and backend services. '||
         'Day to day: reading requirements, writing code, reviewing pull requests, fixing defects.'
       when 'cybersecurity-analyst' then
         'Monitor systems, investigate incidents and harden infrastructure against threats.'
       when 'data-analyst' then
         'Clean and query data, build reports and dashboards, and brief stakeholders.'
       when 'business-analyst' then
         'Document processes, gather requirements and translate business needs into solutions.'
       when 'ui-ux-designer' then
         'Research user needs, design interfaces and prototypes, and validate with users.'
       when 'graphic-designer' then
         'Create visual assets for brand, print and digital channels.'
       when 'content-strategist' then
         'Plan content calendars and editorial direction across channels.'
       when 'marketing-specialist' then
         'Run campaigns, analyse channel performance and grow awareness.'
       else role_description
     end,
       -- Illustrative demo figures, not sourced compensation data.
       median_compensation = case slug
         when 'software-developer' then 55000
         when 'cybersecurity-analyst' then 60000
         when 'data-analyst' then 48000
         when 'business-analyst' then 52000
         when 'ui-ux-designer' then 45000
         when 'graphic-designer' then 38000
         when 'content-strategist' then 40000
         when 'marketing-specialist' then 42000
       end,
       compensation_currency = 'PHP',
       compensation_period = 'annual',
       market_demand = case category
         when 'build' then 'high'
         when 'analyze' then 'high'
         when 'design' then 'medium'
         else 'medium'
       end::public.market_demand,
       learning_effort_months = case slug
         when 'software-developer' then 12
         when 'cybersecurity-analyst' then 14
         when 'data-analyst' then 8
         when 'business-analyst' then 6
         when 'ui-ux-designer' then 8
         when 'graphic-designer' then 6
         when 'content-strategist' then 5
         when 'marketing-specialist' then 6
       end,
       is_sample_data = true;

-- ---- Career relationships (existing 8 careers only)
insert into public.career_relationships (from_career_id, to_career_id, type, rationale, transferable_skills)
select f.id, t.id, v.type::public.career_relationship_type, v.rationale, v.skills::jsonb
from (values
  ('software-developer', 'cybersecurity-analyst', 'pivot',
   'You already build networked systems; pivoting shifts the goal from shipping features to defending them.',
   '["networking","problem-solving","version-control"]'),
  ('software-developer', 'data-analyst', 'pivot',
   'SQL and structured thinking transfer directly. You would trade writing services for querying data.',
   '["sql","problem-solving","javascript"]'),
  ('software-developer', 'ui-ux-designer', 'related',
   'Front-end work puts you close to interface decisions even without a design background.',
   '["javascript","communication"]'),
  ('software-developer', 'business-analyst', 'alternative',
   'A build-adjacent route that leans on requirements and communication rather than code.',
   '["communication","problem-solving"]'),
  ('data-analyst', 'business-analyst', 'next_level',
   'Analysis experience is the strongest predictor of success in a business analyst role.',
   '["sql","data-analysis","communication"]'),
  ('graphic-designer', 'ui-ux-designer', 'next_level',
   'Visual fundamentals transfer; you would add interaction patterns and user research.',
   '["visual-design","figma"]'),
  ('ui-ux-designer', 'graphic-designer', 'alternative',
   'A design route without the research and prototyping load.',
   '["visual-design","figma"]'),
  ('content-strategist', 'marketing-specialist', 'next_level',
   'Content is the input to campaign work; marketing owns the distribution and measurement.',
   '["writing","content-strategy","seo"]'),
  ('marketing-specialist', 'content-strategist', 'alternative',
   'A communications-first route with less focus on paid channels.',
   '["writing","seo"]')
) as v(from_slug, to_slug, type, rationale, skills)
join public.careers f on f.slug = v.from_slug
join public.careers t on t.slug = v.to_slug
on conflict do nothing;

-- ---- Reference data is server-written, so drop the blanket Supabase grants.
-- Student roles keep SELECT (enforced by the RLS policies above) and nothing
-- else. Service role bypasses RLS and retains full access.
do $$
declare t text;
begin
  foreach t in array array[
    'skills', 'careers', 'career_skills', 'learning_activities', 'challenges',
    'learning_resources', 'career_relationships', 'career_roadmaps',
    'roadmap_nodes', 'roadmap_node_dependencies', 'roadmap_node_resources'
  ]
  loop
    execute format('revoke insert, update, delete on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ---- Learning resources (illustrative links)
insert into public.learning_resources (skill_id, title, type, provider, url, duration_minutes, difficulty, description)
select s.id, v.title, v.type::public.resource_type, v.provider, v.url, v.duration_minutes, v.difficulty, v.description
from (values
  ('javascript', 'MDN: JavaScript Guide',            'documentation', 'MDN Web Docs',   'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', 240, 2, 'The reference most working developers keep open.'),
  ('javascript', 'javascript.info — Basics',          'tutorial',      'javascript.info','https://javascript.info/basics', 300, 1, 'Plain-language walkthrough of the fundamentals.'),
  ('javascript', 'freeCodeCamp — JavaScript Algorithms', 'course',    'freeCodeCamp',   'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/', 1200, 3, 'Structured curriculum with in-browser practice.'),
  ('typescript', 'TypeScript Handbook',              'documentation', 'TypeScript',     'https://www.typescriptlang.org/docs/handbook/intro.html', 180, 2, 'Official guide to the type system.'),
  ('sql', 'PostgreSQL Tutorial',                     'documentation', 'PostgreSQL',     'https://www.postgresql.org/docs/current/tutorial.html', 240, 2, 'The official SQL tutorial.'),
  ('sql', 'SQLBolt — Interactive Lessons',          'tutorial',      'SQLBolt',        'https://sqlbolt.com/', 180, 1, 'Short interactive exercises, good for first contact.'),
  ('sql', 'Mode SQL Tutorial',                      'course',        'Mode',           'https://mode.com/sql-tutorial/', 480, 2, 'Analytics-focused SQL with realistic datasets.'),
  ('version-control', 'Pro Git — Getting Started',   'documentation', 'git-scm.com',   'https://git-scm.com/book/en/v2/getting-started', 300, 2, 'The canonical Git book, free online.'),
  ('networking', 'MDN: HTTP Overview',               'documentation', 'MDN Web Docs',   'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview', 150, 2, 'How requests and responses actually work.'),
  ('problem-solving', 'Advent of Code',              'project',       'AoC',            'https://adventofcode.com/', 600, 4, 'One small puzzle a day, escalating in difficulty.'),
  ('communication', 'Write the Docs workshops',      'course',        'Write the Docs', 'https://www.writethedocs.org/guide/', 240, 2, 'Practical sessions on writing clearly for technical readers.')
) as v(skill_slug, title, type, provider, url, duration_minutes, difficulty, description)
join public.skills s on s.slug = v.skill_slug;

-- ---- Software Developer roadmap (the primary demo path)
-- Rerun-safe: only create the v1 roadmap if this career has none yet.
insert into public.career_roadmaps (career_id, version, title, description, is_published)
select c.id, 1, 'Software Developer — Foundations to First Build',
       'A staged path from JavaScript fundamentals through to a deployable API project. '
       || 'Each proof node must be demonstrated before the next tier unlocks.',
       true
from public.careers c
where c.slug = 'software-developer'
  and not exists (select 1 from public.career_roadmaps r where r.career_id = c.id);

insert into public.roadmap_nodes (roadmap_id, key, skill_id, type, title, description, position, unlock_conditions)
-- `position` holds render coordinates ({"tier":2}), so the VALUES column is a
-- jsonb literal cast in the VALUES list rather than at the SELECT.
select r.id, v.key, s.id, v.type::public.roadmap_node_type, v.title, v.description,
       v.position::jsonb, v.unlock::jsonb
from (values
  ('js-fundamentals',  'javascript',       'skill',   'JavaScript Fundamentals',
   'Variables, types, operators and control flow. The base layer everything else rests on.',
   '{"tier":0}', '{}'),
  ('js-dom',           'javascript',       'skill',   'Working with the DOM',
   'Read and update the page from JavaScript; handle events.',
   '{"tier":1}', '{}'),
  ('js-functions',     'javascript',       'skill',   'Functions and Scope',
   'Function declarations, parameters, return values and closures.',
   '{"tier":1}', '{}'),
  ('js-async',         'javascript',       'skill',   'Async JavaScript and the Event Loop',
   'Promises, async/await and handling asynchronous work.',
   '{"tier":2}', '{}'),
  ('sql-basics',       'sql',              'skill',   'SQL Fundamentals',
   'SELECT, WHERE, JOIN and aggregation. How to ask data questions.',
   '{"tier":1}', '{}'),
  ('sql-modeling',     'sql',              'skill',   'Data Modelling with Relationships',
   'Normalisation, keys and joining multiple tables without losing rows.',
   '{"tier":2}', '{}'),
  ('git-workflow',     'version-control',  'skill',   'Git and Collaboration',
   'Branching, reviewing and merging work with others.',
   '{"tier":1}', '{}'),
  ('http-apis',        'networking',       'skill',   'HTTP and APIs',
   'Request methods, status codes, headers and consuming an API.',
   '{"tier":2}', '{}'),
  ('proof-basics',     'javascript',       'proof',   'Proof: Fundamentals Challenge',
   'Demonstrate you can use variables, control flow and functions to solve a real problem.',
   '{"tier":2}', '{"requires_evaluation":true}'),
  ('project-api',      'problem-solving',  'project', 'Build a Small REST API',
   'Design, build, document and deploy a small service with a database behind it.',
   '{"tier":3}', '{"requires_evaluation":true}')
) as v(key, skill_slug, type, title, description, position, unlock)
join public.career_roadmaps r on r.career_id = (select id from public.careers where slug = 'software-developer')
join public.skills s on s.slug = v.skill_slug
-- Rerun guard: skip node seeding if this roadmap already has nodes, instead of
-- failing on the (roadmap_id, key) unique constraint.
where not exists (select 1 from public.roadmap_nodes rn where rn.roadmap_id = r.id);

-- Dependency edges: the RPG tree shape
--   JS Fundamentals -> DOM -> Functions -> Async -> Proof -> API Project
insert into public.roadmap_node_dependencies (node_id, depends_on_node_id, position)
select n.id, d.id, 0
from (values
  ('js-dom',          'js-fundamentals'),
  ('js-functions',    'js-fundamentals'),
  ('git-workflow',    'js-fundamentals'),
  ('sql-basics',      'js-fundamentals'),
  ('js-async',        'js-functions'),
  ('http-apis',       'js-async'),
  ('proof-basics',    'js-dom'),
  ('proof-basics',    'js-functions'),
  ('sql-modeling',    'sql-basics'),
  ('project-api',     'proof-basics'),
  ('project-api',     'http-apis'),
  ('project-api',     'sql-modeling'),
  ('project-api',     'git-workflow')
) as v(node_key, depends_on_key)
join public.roadmap_nodes n on n.key = v.node_key
join public.roadmap_nodes d on d.key = v.depends_on_key and d.roadmap_id = n.roadmap_id
on conflict do nothing;

-- Attach resources to nodes
insert into public.roadmap_node_resources (node_id, resource_id, note, position)
select n.id, lr.id, v.note, v.position
from (values
  ('js-fundamentals', 'MDN: JavaScript Guide',           NULL, 0),
  ('js-fundamentals', 'javascript.info — Basics',        'Start here if the syntax feels unfamiliar.', 1),
  ('js-functions',    'javascript.info — Basics',        'Sections 2.1 to 2.4 cover function syntax.', 0),
  ('js-dom',          'MDN: JavaScript Guide',           'The DOM section of the guide.', 0),
  ('js-async',        'MDN: JavaScript Guide',           'Read the async section before the project.', 0),
  ('sql-basics',      'SQLBolt — Interactive Lessons',   'Fastest way to get comfortable with SELECT.', 0),
  ('sql-basics',      'PostgreSQL Tutorial',             'The official version, once the basics land.', 1),
  ('sql-modeling',    'Mode SQL Tutorial',               'Multi-table exercises.', 0),
  ('git-workflow',    'Pro Git — Getting Started',       'Chapters 2 and 3 are enough for a first workflow.', 0),
  ('http-apis',       'MDN: HTTP Overview',              NULL, 0),
  ('project-api',     'Advent of Code',                  'Optional warm-up if the project brief feels thin.', 0)
) as v(node_key, resource_title, note, position)
join public.roadmap_nodes n on n.key = v.node_key
join public.learning_resources lr on lr.title = v.resource_title
on conflict do nothing;

-- Tie the proof node to the challenge that satisfies it, via the real FK rather
-- than a title string in metadata. get_node_unlock_state() resolves it from here.
update public.roadmap_nodes n
   set challenge_id = c.id,
       metadata = n.metadata || jsonb_build_object('challenge_title', c.title)
  from public.challenges c
  join public.skills s on s.id = c.skill_id and s.slug = 'javascript'
 where n.key = 'proof-basics'
   and n.roadmap_id = (select id from public.career_roadmaps
                        where career_id = (select id from public.careers where slug = 'software-developer')
                        order by version limit 1)
   and c.title = 'Build a tip calculator';

-- Populate the derived JSON cache so a single-row read works immediately.
select public.refresh_roadmap_definition(id)
from public.career_roadmaps
where career_id = (select id from public.careers where slug = 'software-developer');


-- =============================================================================
-- Validation — non-destructive checks, safe to re-run
-- =============================================================================

do $$
declare
  v_missing_rls text;
  v_bad_ref     text;
  v_bad_owner   text;
begin
  -- Every public table must have RLS enabled.
  select string_agg(c.relname, ', ')
    into v_missing_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity;

  if v_missing_rls is not null then
    raise exception 'Tables without RLS enabled: %', v_missing_rls;
  end if;

  -- Reference tables must not be writable by anon/authenticated. Checked
  -- privilege-by-privilege: has_table_privilege takes one privilege at a time.
  select string_agg(t.table_name || ':' || p.priv, ', ')
    into v_bad_ref
  from (values
    ('skills'), ('careers'), ('career_skills'),
    ('learning_activities'), ('challenges'), ('learning_resources'),
    ('career_relationships'), ('career_roadmaps'), ('roadmap_nodes'),
    ('roadmap_node_dependencies'), ('roadmap_node_resources')
  ) as t(table_name)
  cross join (values ('INSERT'), ('UPDATE'), ('DELETE')) as p(priv)
  where has_table_privilege('authenticated', t.table_name, p.priv)
     or has_table_privilege('anon', t.table_name, p.priv);

  if v_bad_ref is not null then
    raise exception 'Reference tables writable by client roles: %', v_bad_ref;
  end if;

  -- Every user-owned table must have a SELECT policy scoped to the owner.
  select string_agg(t.table_name, ', ')
    into v_bad_owner
  from (values
    ('profiles'), ('onboarding_sessions'), ('onboarding_questions'),
    ('onboarding_responses'), ('resumes'), ('user_skills'),
    ('user_roadmap_progress'), ('activity_progress'),
    ('challenge_submissions'), ('career_exploration'),
    ('conversations'), ('messages')
  ) as t(table_name)
  where not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = t.table_name
      -- pg_policies reports cmd in upper case.
      and cmd = 'SELECT'
  );

  if v_bad_owner is not null then
    raise exception 'User-owned tables with no SELECT policy: %', v_bad_owner;
  end if;

  -- Foreign keys must all resolve: every user-owned row points at a real user.
  if exists (
    select 1 from public.user_roadmap_progress p
    where not exists (select 1 from auth.users u where u.id = p.user_id)
  ) then
    raise exception 'Orphan user_roadmap_progress rows';
  end if;

  -- Students must not be able to write server-computed columns on any path.
  -- INSERT matters as much as UPDATE: revoking only UPDATE leaves the client free
  -- to insert a row that already claims the result.
  if has_table_privilege('authenticated', 'user_skills', 'INSERT')
     or has_table_privilege('authenticated', 'user_skills', 'UPDATE') then
    raise exception 'user_skills must not be writable by authenticated at table level';
  end if;
  if has_table_privilege('authenticated', 'challenge_submissions', 'INSERT')
     or has_table_privilege('authenticated', 'challenge_submissions', 'UPDATE') then
    raise exception 'challenge_submissions must not be writable by authenticated at table level';
  end if;
  if has_table_privilege('authenticated', 'career_exploration', 'INSERT')
     or has_table_privilege('authenticated', 'career_exploration', 'UPDATE') then
    raise exception 'career_exploration must not be writable by authenticated at table level';
  end if;
  if has_table_privilege('authenticated', 'resumes', 'INSERT')
     or has_table_privilege('authenticated', 'resumes', 'UPDATE') then
    raise exception 'resumes must not be writable by authenticated at table level';
  end if;
  if has_column_privilege('authenticated', 'public.profiles', 'onboarding_completed', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profiles', 'onboarding_completed_at', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profiles', 'ai_context', 'UPDATE') then
    raise exception 'onboarding_completed / ai_context must not be writable by authenticated';
  end if;

  -- Draft roadmaps must be invisible to students.
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'career_roadmaps'
      and cmd = 'SELECT' and qual = 'true'
  ) then
    raise exception 'career_roadmaps select policy must not expose unpublished roadmaps';
  end if;

  -- Proof nodes must resolve through a real challenge FK.
  if exists (
    select 1 from public.roadmap_nodes
    where (metadata ? 'challenge_title') and challenge_id is null
  ) then
    raise exception 'Roadmap nodes reference a challenge in metadata but have no challenge_id';
  end if;

  raise notice 'Validation passed: RLS on all tables, reference data locked, ownership policies present, server-written columns not client-writable, drafts hidden, proof nodes use challenge_id.';
end $$;



-- ############################################################################
-- ##  DEMO DATA  —  optional
-- ############################################################################
-- A fictional student ("Ana") demonstrating the intended flow. Not real data.
-- Runs as the service role, because the guard triggers reject server-written
-- columns from any other role.
-- ############################################################################
-- Fictional demo student "Ana". Not real data.
--
-- The guard triggers require the service role for server-written columns, so
-- this script impersonates it. The same session variable makes auth.role()
-- return 'service_role'.
select set_config('request.jwt.claim.role', 'service_role', false);

-- on conflict so the script can be re-run against an existing database
insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111','ana@example.test','{"full_name":"Ana Reyes"}')
on conflict (id) do nothing;

select 'profile_autocreated: '||count(*) from public.profiles where id='11111111-1111-1111-1111-111111111111';

update public.profiles set
  year_level='third_year', program='BS Computer Science', graduation_year=2027,
  interests=array['web development','problem solving'],
  learning_preferences='{"format":"short activities","pace":"self-directed"}'::jsonb,
  career_aspiration='Software Developer', career_aspiration_industry='Technology',
  career_aspiration_source='student', career_aspiration_set_at=now(),
  onboarding_completed=true, onboarding_completed_at=now()
where id='11111111-1111-1111-1111-111111111111';

insert into public.onboarding_sessions (user_id, status, completed_at)
values ('11111111-1111-1111-1111-111111111111','completed',now());

insert into public.onboarding_questions (session_id, key, type, prompt, options, is_generated, position)
select s.id, v.key, v.type::public.onboarding_question_type, v.prompt, v.options::jsonb, true, v.pos
from public.onboarding_sessions s,
(values
  ('role_interest','open','What kind of problems do you enjoy solving?','[]',1),
  ('role_domain','single_choice','Which area pulls you in most?','[{"value":"build","label":"Build"},{"value":"analyze","label":"Analyze"}]',2),
  ('build_stack','open','You picked Build. Which stack interests you?','[]',3)
) as v(key,type,prompt,options,pos)
where s.user_id='11111111-1111-1111-1111-111111111111';

-- contextual: the third question depends on the second
update public.onboarding_questions q set depends_on_key='role_domain'
from public.onboarding_sessions s
where q.session_id=s.id and q.key='build_stack' and s.user_id='11111111-1111-1111-1111-111111111111';

insert into public.onboarding_responses (session_id, question_id, user_id, answer, answer_data)
select q.session_id, q.id, s.user_id, v.answer, v.data::jsonb
from public.onboarding_questions q
join public.onboarding_sessions s on s.id=q.session_id,
(values
  ('role_interest','Things that break and need debugging','{}'),
  ('role_domain','build','{"selected":["build"]}'),
  ('build_stack','JavaScript and anything on the web','{}')
) as v(k,answer,data)
where s.user_id='11111111-1111-1111-1111-111111111111' and q.key=v.k;

insert into public.resumes (user_id, storage_path, original_filename, mime_type, consent_given,
                            consented_at, parse_status, parsed_at, parsed_context, parsed_model)
values ('11111111-1111-1111-1111-111111111111','ana/resume.pdf','ana-resume.pdf',
        'application/pdf',true,now(),'succeeded',now(),
        '{"summary":"CS student, two web projects.","skills":["JavaScript","SQL"],"experience":["Internship, web team"]}'::jsonb,
        'demo-model-v1');

-- Ana has demonstrated JavaScript and started SQL
insert into public.user_skills (user_id, skill_id, state, confidence)
select '11111111-1111-1111-1111-111111111111', s.id, v.state::public.skill_state, v.conf
from public.skills s, (values
  ('javascript','demonstrated',80),('sql','developing',35),('figma','started',5)
) as v(slug,state,conf) where s.slug=v.slug;

-- Explainable match + bookmark
insert into public.career_exploration (user_id, career_id, fit_score, match_explanation, match_factors, generated_at, model_identifier, is_saved, saved_at, notes)
select '11111111-1111-1111-1111-111111111111', c.id, 78,
       'This path surfaced because you showed interest in building software and already have experience with JavaScript.',
       '[{"kind":"interest","detail":"wants to build software","weight":0.4},{"kind":"skill","detail":"demonstrated JavaScript","weight":0.5},{"kind":"gap","detail":"SQL developing","weight":0.1}]'::jsonb,
       now(),'demo-model-v1',true,now(),'Primary path'
from public.careers c where c.slug='software-developer';

insert into public.career_exploration (user_id, career_id, fit_score, match_explanation, match_factors, generated_at, is_saved)
select '11111111-1111-1111-1111-111111111111', c.id, 54,
       'Surfaced because your SQL work transfers, without a full backend pivot.',
       '[{"kind":"skill","detail":"SQL developing","weight":0.6}]'::jsonb, now(), false
from public.careers c where c.slug='data-analyst';

-- Progress: Ana finished the two root skills, one is in progress
insert into public.user_roadmap_progress (user_id, roadmap_id, node_id, status, started_at, completed_at, completion_source)
select '11111111-1111-1111-1111-111111111111', n.roadmap_id, n.id,
       v.status::public.node_progress_status,
       now() - interval '10 days',
       case when v.status = 'completed' then now() - interval '2 days' else null end,
       case when v.status = 'completed' then 'evaluation' else null end
from (values
  ('js-fundamentals','completed'),
  ('sql-basics','in_progress')
) as v(node_key, status)
join public.roadmap_nodes n on n.key = v.node_key;

-- One evaluated submission on the proof challenge
insert into public.challenge_submissions (user_id, challenge_id, attempt_number, content, repo_url, status, score, evaluation, evaluated_at, model_identifier)
select '11111111-1111-1111-1111-111111111111', c.id, 1,
       'function tipCalculator(bill, pct) {...}','https://github.test/ana/tip','passed',88,
       '[{"criterion":"Correct calculation","score":40,"max":40}]'::jsonb, now(),'demo-model-v1'
from public.challenges c join public.skills s on s.id=c.skill_id
where s.slug='javascript' and c.title='Build a tip calculator';

insert into public.messages (conversation_id, user_id, role, content)
select conv.id, conv.user_id, m.role::public.message_role, m.content
from public.conversations conv,
(values ('user','Hi, I do not know what career to pick.'),
        ('assistant','That is a fine place to start. What kind of problems do you enjoy solving?')) as m(role,content)
where conv.user_id='11111111-1111-1111-1111-111111111111';
