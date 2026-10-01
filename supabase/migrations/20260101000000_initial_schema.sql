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
