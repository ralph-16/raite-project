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
