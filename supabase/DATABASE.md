# Ka-Lakbay Database Schema

Reference documentation for the Ka-Lakbay Supabase/PostgreSQL database.

The schema supports the product flow: **onboarding → context → career match → RPG roadmap → learning → proof → AI evaluation → skill state → updated roadmap**.

---

## Files

| File | Purpose |
|---|---|
| `schema.sql` | **Start here.** Complete schema in one file, for a fresh database. |
| `seed.sql` | Optional demo data (a fictional student, "Ana"). |
| `migrations/20260101000000_initial_schema.sql` | Foundation. Profiles, skills, careers, learning, proof, RLS. |
| `migrations/20260102000000_roadmaps_onboarding_context.sql` | Onboarding, resume, explainable matching, RPG roadmaps, resources. |
| `migrations/20261002000000_grant_profiles_aspiration_source.sql` | **Superseded.** Granted `UPDATE(career_aspiration_source)` to `authenticated`; no longer needed (see below). |
| `migrations/20261003000000_revoke_profiles_aspiration_source.sql` | Revokes that grant. `career_aspiration_source` / `career_aspiration_set_at` are written only via the service-role client in `POST /api/profiler`, so authenticated clients lose nothing. |

`schema.sql` is **generated** by concatenating the migrations plus the seed. Edit the migration files, then regenerate — do not hand-edit `schema.sql`, or the change is lost on the next build. Note: `schema.sql` currently reflects only migrations 1–2; it does not yet include the grant/revoke migrations, so a fresh database built from `schema.sql` alone will still carry the old column grant until it is regenerated.

### Applying

Fresh database:

```bash
# Dashboard → SQL Editor → New query → paste → Run
supabase db push
psql "$DATABASE_URL" -f supabase/schema.sql
```

Incremental (a migration was already applied):

```bash
supabase db push
```

`schema.sql` is a snapshot, not a migration. It contains bare `create table` / `create type`, so running it twice fails by design. Migrations 1–2 are re-runnable: every `create type`, `create trigger` and `create policy` in migration 2 is guarded with a `do $$ ... exception when duplicate_object` block or a preceding `drop ... if exists`, and its seed inserts are idempotent. The grant/revoke migrations are plain idempotent statements (re-running a revoke of an absent privilege only warns).

Local reset (drops the DB, replays migrations + seed):

```bash
supabase db reset
```

---

## Architecture

Three groups of data, with different access rules:

| Group | Tables | Who can write |
|---|---|---|
| **Reference** | `skills`, `careers`, `career_skills`, `learning_activities`, `challenges`, `learning_resources`, `career_relationships`, `career_roadmaps`, `roadmap_nodes`, `roadmap_node_dependencies`, `roadmap_node_resources` | Service role only |
| **User-owned** | `profiles`, `onboarding_*`, `resumes`, `user_skills`, `user_roadmap_progress`, `activity_progress`, `challenge_submissions`, `career_exploration`, `conversations`, `messages` | Owner, with column-level limits |
| **Derived** | Nothing. Computed by RPC. | — |

Two design rules run through the whole schema:

**Proof over consumption.** The product tracks what a student can *demonstrate*, not what they clicked. `skill_state` only advances through server-side evaluation — enforced twice (see [Security](#security)).

**Derived state is never stored.** Node lock state, skill gaps, roadmap JSON and match scores are all computed by RPC. There is no column that can drift out of sync with its inputs.

---

## Entity map

```
auth.users
    │
    ▼
profiles ──── ai_context jsonb          (strengths, developing/unassessed areas)
    │         career_aspiration         (optional)
    ├──► onboarding_sessions ──► onboarding_questions ──► onboarding_responses
    │         depends_on_key = contextual branching
    └──► resumes ──► parsed_context jsonb

    ┌──────────────────────────────────────────────┐
    ▼                                              ▼
user_skills                                  career_exploration
    │                                          fit_score + match_explanation
    │                                          match_factors + is_saved
    ▼                                              │
career_skills ──────────────────────────────► careers ──► career_relationships
    │                                              │      (related / next_level /
    │                                              │       pivot / alternative)
    │                                              ▼
    │                                       career_roadmaps ──► roadmap_nodes
    │                                              │              ▲        │
    │                                     definition jsonb          │        │
    │                                     (derived cache)           │        ▼
    │                                                     dependencies   roadmap_node_resources
    │                                                                      │
    ▼                                                                      ▼
challenges ◄──────────────────────────────────────────────── learning_resources
    │
    ▼
challenge_submissions ──► evaluation jsonb ──► (server) ──► user_skills.state
    │                                                          │
    ▼                                                          ▼
activity_progress                              user_roadmap_progress
```

---

## Tables

### Reference data

#### `careers`
The 8 seeded career paths. `slug` is the stable identifier for imports and URLs.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `slug` | text | unique, e.g. `software-developer` |
| `title` | text | |
| `category` | `career_category` | `build` / `analyze` / `design` / `communicate` |
| `description` | text | |
| `role_description` | text | Day-to-day work detail (migration 2) |
| `median_compensation` | integer | **Sample data** |
| `compensation_currency` | text | ISO-4217, 3 uppercase letters |
| `compensation_period` | text | `hourly` / `monthly` / `annual` |
| `market_demand` | `market_demand` | `high` / `medium` / `low` |
| `learning_effort_months` | smallint | 1–120, rough time to job-ready |
| `is_sample_data` | boolean | `true` for all seeded figures |
| `created_at`, `updated_at` | timestamptz | |

> All seeded compensation and demand figures are illustrative. Set `is_sample_data = false` only when backed by a real source, and surface them as estimates in the UI.

#### `skills`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `slug` | text | unique |
| `name` | text | Trigram-indexed for fuzzy search |
| `category` | text | Matches career categories |
| `description` | text | |

#### `career_skills`
Which skills a career needs, and how much.

| Column | Type | Notes |
|---|---|---|
| `career_id`, `skill_id` | uuid | Composite PK, both cascade |
| `importance` | smallint | 1–5 |

#### `learning_activities`
Ka-Lakbay's own micro-lessons. Distinct from `learning_resources`, which is external material.

| Column | Type | Notes |
|---|---|---|
| `skill_id` | uuid | FK |
| `kind` | `activity_kind` | `concept` / `example` / `practice` |
| `title`, `content` | text | |
| `position` | smallint | Ordering within a skill |

#### `challenges`
Proof tasks. `rubric` is a JSONB array scored by the evaluation step:

```json
[{"criterion": "Correct calculation", "points": 40},
 {"criterion": "Edge cases handled", "points": 30}]
```

#### `learning_resources`
External educational material for the roadmap resource drawer.

| Column | Type | Notes |
|---|---|---|
| `skill_id` | uuid | Required — makes it findable from the profile |
| `type` | `resource_type` | `course` / `documentation` / `tutorial` / `article` / `video` / `project` / `assessment` |
| `provider`, `url` | text | `url` must match `^https?://` |
| `duration_minutes` | integer | |
| `difficulty` | smallint | 1–5 |

One resource can appear on several roadmap nodes via `roadmap_node_resources` — no duplication.

#### `career_relationships`
Directed graph over the same 8 careers. Enables "related", "next level", "pivot" and "alternative" paths without adding career types.

| Column | Type | Notes |
|---|---|---|
| `from_career_id`, `to_career_id` | uuid | Self-links rejected by CHECK |
| `type` | `career_relationship_type` | |
| `rationale` | text | Shown as the "why" copy |
| `transferable_skills` | jsonb | Overlapping skills behind a pivot |

#### `career_roadmaps`
One RPG skill tree per career, versioned.

| Column | Type | Notes |
|---|---|---|
| `career_id` | uuid | |
| `version` | integer | Unique per career. Lets a tree be revised without breaking students mid-progress |
| `title`, `description` | text | |
| `is_published` | boolean | At most one published roadmap per career (partial unique index) |
| `definition` | jsonb | **Derived cache** — see below |

#### `roadmap_nodes`
A single step on the tree. **Authoritative** structure.

| Column | Type | Notes |
|---|---|---|
| `roadmap_id` | uuid | |
| `key` | text | Stable per roadmap; survives edits, used by imports |
| `skill_id` | uuid | Nullable — `project` / `milestone` nodes cover no single skill |
| `type` | `roadmap_node_type` | `skill` / `milestone` / `project` / `proof` / `resource_only` |
| `title`, `description` | text | |
| `position` | jsonb | Render hint, e.g. `{"tier": 2}` |
| `unlock_conditions` | jsonb | Extra rules — see below |
| `challenge_id` | uuid | FK → `challenges`. The proof that satisfies a `proof` node |
| `metadata` | jsonb | Node-local extras needing no referential integrity |

`unlock_conditions` supports two keys, both evaluated by `get_node_unlock_state()`:

```json
{"requires_evaluation": true, "min_score": 70}
```

`requires_evaluation` needs a **passed** submission on `challenge_id`. `min_score` needs that passed submission to score at least the given value. Unknown keys are ignored.

A node that requires evaluation but has no `challenge_id` can never unlock — a content bug that shows up as a permanently locked node. `guard_node_challenge_skill()` also enforces that a node naming both a `skill_id` and a `challenge_id` names the skill that challenge is written against.

#### `roadmap_node_dependencies`
Prerequisite edges. A node unlocks when **all** its `depends_on_node_id` rows are complete (AND semantics).

Two guards: `guard_dependency_same_roadmap()` rejects edges across roadmaps, and `guard_no_dependency_cycle()` rejects any edge that would close a loop, so unlock computation can never recurse forever.

#### `roadmap_node_resources`
Many-to-many join between nodes and resources, with a per-node `note`.

### User-owned data

#### `profiles`
1:1 with `auth.users`. Created automatically by the `on_auth_user_created` trigger.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, FK → `auth.users` cascade |
| `display_name` | text | Required |
| `year_level` | `year_level` | `first_year` … `working` |
| `program`, `graduation_year`, `bio` | | |
| `interests` | text[] | |
| `learning_preferences` | jsonb | |
| `career_aspiration` | text | **Optional.** NULL is a valid state |
| `career_aspiration_industry` | text | |
| `career_aspiration_source` | text | `student` / `inferred` |
| `career_aspiration_set_at` | timestamptz | |
| `ai_context` | jsonb | Server-written. See below |
| `ai_context_generated_at` | timestamptz | |
| `ai_context_model` | text | Opaque provider label |
| `onboarding_completed` | boolean | Gates the dashboard redirect |
| `onboarding_completed_at` | timestamptz | |
| `resume_url` | text | Legacy pointer; prefer `resumes` |

`ai_context` is `jsonb` rather than more columns because its shape is model-driven and will change. Intended contents:

```json
{
  "strengths": [],
  "developing_areas": [],
  "unassessed_areas": [],
  "experience": [],
  "knowledge": [],
  "career_uncertainty": {},
  "evidence": []
}
```

#### `onboarding_sessions` / `onboarding_questions` / `onboarding_responses`
Purpose-built onboarding persistence, queryable independently of the chat log. `conversations` / `messages` remain the narrative record; these are the structured one.

`onboarding_sessions` — one run per student. A partial unique index allows only one `in_progress` session per user, so an abandoned flow can be resumed without accumulating parallel state.

`onboarding_questions` — `key` is unique within a session. `depends_on_key` is a composite self-FK to `(session_id, key)`, which is how contextual questioning is expressed: later questions reference the answer they branched on. `is_generated` distinguishes AI-authored questions from knowledge-base ones.

`onboarding_responses` — one answer per question (`unique (session_id, question_id)`), so re-answering overwrites. `answer_data` jsonb holds machine-readable payloads (`{"selected": [...]}` for multi-choice, `{"value": 4}` for scale) alongside the human-readable `answer`.

`session_id`, `question_id` and `user_id` are three independent columns, and the RLS policy only checks that `user_id` owns `session_id`. `guard_response_session_question()` therefore requires all three to agree, closing a path where a student could file a response against another student's question and read it back inside their own context bundle.

#### `resumes`
Optional, consent-gated upload.

| Column | Type | Notes |
|---|---|---|
| `storage_path` | text | Path in a **private** bucket. Serve via signed URL |
| `original_filename`, `mime_type` | | PDF or DOCX only, enforced by CHECK |
| `consent_given`, `consented_at` | | Revocable |
| `parse_status` | `parse_status` | `pending` / `processing` / `succeeded` / `failed` / `skipped` |
| `parsed_at`, `parsed_model`, `parse_error` | | |
| `parsed_context` | jsonb | `{ summary, skills, experience, education, projects }` |

A partial unique index keeps at most one consented resume per student.

#### `user_skills`
Per-student skill state. **Server-written.**

| Column | Type | Notes |
|---|---|---|
| `user_id`, `skill_id` | uuid | Composite PK |
| `state` | `skill_state` | `started` → `developing` → `demonstrated` → `strong` |
| `confidence` | smallint | 0–100 |
| `demonstrated_at` | timestamptz | |

Students may `insert` a `started` row and read their state back. They cannot `update` any column — see [Security](#security).

#### `user_roadmap_progress`
Per-node progress. **Only real student action is stored.**

| Column | Type | Notes |
|---|---|---|
| `user_id`, `roadmap_id`, `node_id` | uuid | |
| `status` | `node_progress_status` | `not_started` / `in_progress` / `completed` |
| `started_at`, `completed_at` | timestamptz | |
| `completion_source` | text | Distinguishes a proven node from a self-marked one |

`locked` is deliberately **not** a status. It is derived from dependencies and `unlock_conditions` by `get_node_unlock_state()`, so adding a prerequisite later cannot leave stale lock rows behind. A CHECK keeps `status = 'completed'` and `completed_at IS NOT NULL` in agreement.

`roadmap_id` is derivable from `node_id`, so `guard_progress_node_roadmap()` enforces that the two agree. A stale copy would silently hide a student's progress, since `get_node_unlock_state()` filters on `roadmap_id`.

#### `activity_progress`
Completion of `learning_activities`. Kept separate from roadmap progress — micro-lessons are not roadmap nodes.

#### `challenge_submissions`
**One row per attempt.** Multiple attempts per challenge are retained, each with its own evaluation; an older result is never overwritten.

| Column | Type | Notes |
|---|---|---|
| `user_id`, `challenge_id` | uuid | |
| `attempt_number` | smallint | Unique per (user, challenge) |
| `content`, `repo_url` | text | Student-editable |
| `status` | `submission_status` | `submitted` / `evaluating` / `passed` / `needs_revision` |
| `score` | smallint | 0–100, server-written |
| `evaluation` | jsonb | Rubric result, server-written |
| `evaluated_at` | timestamptz | |
| `model_identifier`, `generation_metadata` | | Opaque provider label |

Students may only ever write `submitted`. The evaluation service advances the rest.

#### `career_exploration`
Recommendation and bookmark state in one row. A saved-but-unexplored career simply has a `NULL fit_score`.

| Column | Type | Notes |
|---|---|---|
| `user_id`, `career_id` | uuid | Composite PK |
| `fit_score` | smallint | 0–100, server-written |
| `match_explanation` | text | Plain-language "why" |
| `match_factors` | jsonb | The factors behind the score |
| `generated_at`, `model_identifier` | | |
| `is_saved`, `saved_at` | | Bookmark |
| `notes` | text | Student-editable |

`match_factors` supports UI copy such as *"This path surfaced because you showed interest in building software and already have experience with JavaScript"*:

```json
[{"kind": "interest", "detail": "wants to build software", "weight": 0.4},
 {"kind": "skill",   "detail": "demonstrated JavaScript",  "weight": 0.5},
 {"kind": "gap",     "detail": "SQL developing",           "weight": 0.1}]
```

#### `conversations` / `messages`
AI companion chat. `messages.user_id` is denormalized so RLS needs no join and history reads are direct. Messages are immutable; cursor pagination uses `(conversation_id, created_at desc)`.

---

## Enums

| Enum | Values |
|---|---|
| `skill_state` | `started`, `developing`, `demonstrated`, `strong` |
| `activity_kind` | `concept`, `example`, `practice` |
| `progress_status` | `not_started`, `in_progress`, `completed` |
| `node_progress_status` | `not_started`, `in_progress`, `completed` |
| `roadmap_node_type` | `skill`, `milestone`, `project`, `proof`, `resource_only` |
| `resource_type` | `course`, `documentation`, `tutorial`, `article`, `video`, `project`, `assessment` |
| `career_category` | `build`, `analyze`, `design`, `communicate` |
| `career_relationship_type` | `related`, `next_level`, `pivot`, `alternative` |
| `market_demand` | `high`, `medium`, `low` |
| `onboarding_status` | `in_progress`, `completed`, `abandoned` |
| `onboarding_question_type` | `open`, `single_choice`, `multi_choice`, `boolean`, `scale` |
| `parse_status` | `pending`, `processing`, `succeeded`, `failed`, `skipped` |
| `submission_status` | `submitted`, `evaluating`, `passed`, `needs_revision` |
| `year_level` | `first_year`, `second_year`, `third_year`, `fourth_year`, `graduate`, `working` |
| `message_role` | `user`, `assistant` |

---

## JSON roadmap: source of truth

The product requires the whole tree as one JSON object, but a node is a real entity with foreign keys — it has a skill reference, is depended on by other nodes, and owns progress rows. So:

**Authoritative** — `roadmap_nodes` and `roadmap_node_dependencies`, with full referential integrity and cycle detection.

**Derived cache** — `career_roadmaps.definition`. Regenerate with `refresh_roadmap_definition(roadmap_id)` after editing nodes or edges. Never write it by hand.

**Read path** — `get_roadmap_definition(career_id)` rebuilds from the relational tables on demand, so the cache is never the only copy.

```json
{
  "roadmap": {"id": "...", "career_id": "...", "version": 1, "title": "..."},
  "nodes": [
    {"id": "...", "key": "js-fundamentals", "title": "JavaScript Fundamentals",
     "type": "skill", "skill_id": "...", "position": {"tier": 0},
     "unlock_conditions": {}, "metadata": {},
     "resources": [{"id": "...", "title": "MDN: JavaScript Guide",
                    "type": "documentation", "url": "https://..."}]}
  ],
  "edges": [{"node_id": "...", "depends_on_node_id": "..."}]
}
```

---

## RPCs

All are `SECURITY INVOKER`, so RLS applies to the caller.

| Function | Returns | Use |
|---|---|---|
| `get_roadmap_definition(career_id)` | jsonb | Whole tree: nodes, edges, per-node resources |
| `get_node_unlock_state(roadmap_id)` | table | `locked` / `unlocked` / `in_progress` / `completed` per node, derived from progress + edges |
| `get_skill_gaps(career_id)` | table | Requirements not yet demonstrated, largest gap first |
| `get_onboarding_context()` | jsonb | One call: profile, aspiration, onboarding answers, resume parse, skill state |
| `get_recommended_careers()` | table | Scored recommendations + saved careers, each with explanation and gap count |
| `get_career_detail(career_id)` | jsonb | Metadata, required skills, gaps, next paths, roadmap JSON, saved flag |

`refresh_roadmap_definition(roadmap_id)` (`SECURITY DEFINER`, returns `void`) rebuilds the cache. Run it server-side after authoring changes.

---

## Security

### Skill-state integrity

The product principle: **track what students can demonstrate, not what they consumed.** If a client could write `state = 'strong'`, the proof model would be meaningless. Two independent layers, neither of which weakens RLS:

1. **Grants.** `REVOKE UPDATE ON user_skills FROM anon, authenticated` with **no column re-grant**. Column-level revokes alone would be useless — Supabase grants blanket table privileges, and a table-level grant is not narrowed by a column-level revoke.
2. **Trigger.** `guard_skill_state_promotion()` raises unless `auth.role() = 'service_role'`. This catches non-REST write paths regardless of grants.

Same pattern for `challenge_submissions` (students get `UPDATE` on `content` and `repo_url` only) and `career_exploration` (`is_saved`, `saved_at`, `notes` only).

The intended path:

```
student reads own state → submits challenge → server-side evaluation
  → service-role write advances state and progress
```

### RLS

All 23 tables have RLS enabled.

- **User-owned tables** — owner only, via `public.is_owner(row_user_id)`, a `SECURITY DEFINER` function so policies can read `auth.uid()` without recursion. Tables with no `user_id` of their own (`onboarding_questions`) resolve ownership through the parent session.
- **Reference tables** — `SELECT` only. `INSERT`, `UPDATE`, `DELETE` are revoked from `anon` and `authenticated`; only the service role can write.

Ownership comes from `auth.users(id)`, never from a client-supplied value. An insert carrying another student's `user_id` is rejected by the policy's `WITH CHECK`.

### Storage

`resumes.storage_path` points into a **private** bucket. The file contains personal data and must be served through a signed URL, never a public one.

### AI provider independence

The provider is not finalized, so nothing in the schema assumes one. Generated output carries `generated_at`, an opaque `model_identifier`, and `generation_metadata`. Switching providers means new values in existing columns — no migration.

---

## Indexing

78 indexes. Every foreign key is indexed (Postgres does not do this for you). Composite indexes are added where the query pattern justifies them.

| Query | Index |
|---|---|
| Current onboarding session | `onboarding_sessions_user_status_idx` (partial: one open per user) |
| Onboarding responses | `onboarding_responses_session_idx`, `_question_idx` |
| Student's careers, scored first | `career_exploration_user_scored_idx` (partial: `fit_score IS NOT NULL`) |
| Saved careers | `career_exploration_saved_idx` (partial: `is_saved`) |
| Student's skill state, worst first | `user_skills_user_state_idx` |
| Career skills, reverse lookup | `career_skills_skill_id_idx` |
| Career roadmap | `career_roadmaps_career_version_idx`, partial unique on `is_published` |
| Roadmap nodes | `roadmap_nodes_roadmap_idx`, `roadmap_nodes_skill_idx` (partial) |
| Prerequisites of a node | `roadmap_node_dependencies_depends_idx` |
| Node resources | `roadmap_node_resources_resource_idx` |
| Progress by roadmap + status | `user_roadmap_progress_user_roadmap_status_idx` |
| Completed nodes, recency | `user_roadmap_progress_user_completed_idx` (partial) |
| Skill submissions | `challenge_submissions_user_created_idx`, `_latest_idx` (covering) |
| Retry attempts | `challenge_submissions_attempt_idx` (unique) |
| Fuzzy skill search | `skills_name_trgm_idx` (GIN trigram, needs `pg_trgm`) |
| Chat history cursor | `messages_conversation_created_idx` |
| Career filtering | `careers_category_demand_idx`, `careers_learning_effort_idx` |

---

## Seed data

Reference: 8 careers, 18 skills, 35 career-skill mappings, 9 career relationships, 11 learning resources, 6 learning activities, 2 challenges.

Software Developer is the primary demo path — a published roadmap with 10 nodes and 13 edges:

```
js-fundamentals ─┬─► js-dom ──┐
                ├─► js-functions ──► js-async ──► http-apis ──┐
                ├─► git-workflow ────────────────────────────┤
                ├─► sql-basics ──► sql-modeling ─────────────┤
                └─► proof-basics ◄──┘                        │
                          │                                    ▼
                     project-api  ◄────────────────────────────┘
```

`proof-basics` carries `unlock_conditions = {"requires_evaluation": true}` and points at the "Build a tip calculator" challenge through its `metadata`.

`supabase/seed.sql` adds a fictional student, **Ana Reyes** — third-year CS student, aspiring Software Developer, JavaScript demonstrated, SQL developing, one roadmap node complete, one evaluated submission. Not real data.

### Demo queries

```sql
-- Set an identity (Supabase sets these from the JWT automatically)
select set_config('request.jwt.claim.sub',
  '11111111-1111-1111-1111-111111111111', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

select * from public.get_recommended_careers();
select * from public.get_node_unlock_state(
  (select id from public.career_roadmaps limit 1));
select public.get_roadmap_definition(
  (select id from public.careers where slug = 'software-developer'));
```

---

## Application-layer work not yet done

The schema provides the hooks; no application code calls them yet.

| Task | Hook |
|---|---|
| Parse an uploaded resume | `resumes.parse_status` → `parsed_context` |
| Generate personalization | write `profiles.ai_context` + `ai_context_model` |
| Grade a submission | write `status` / `score` / `evaluation` via service role |
| Advance skill state after a pass | `user_skills.state`, service role only |
| Mark a proof node complete | `user_roadmap_progress.completion_source` |
| Score career fit | `career_exploration.fit_score` + `match_factors` |
| Author roadmap content | `roadmap_nodes` → `refresh_roadmap_definition()` |

Upload target: a private Storage bucket at `resumes/<user_id>/<filename>`.

---

## Verified

Checked against PostgreSQL 16:

- Both migrations apply clean; migration 2 re-runs 3× with no errors and no row duplication
- 23 tables all with RLS, 49 policies, 37 foreign keys, 78 indexes, 15 enums, 11 functions, 19 triggers
- Student cannot promote own skill state (blocked at both the grant and trigger layer)
- Student cannot forge an evaluation or a passing score
- Reference tables reject writes from `anon` and `authenticated`
- One student sees zero rows of another's across all 12 user-owned tables, while still reading all reference data
- Cross-user insert carrying another student's `user_id` is rejected
- Dependency cycles and cross-roadmap edges are rejected
- Attempt 2 is retained alongside attempt 1 with independent scores
