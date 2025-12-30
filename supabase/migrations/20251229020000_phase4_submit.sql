-- PHASE 4: submit + persistence + results retrieval
-- Adds idempotency + scoring fields and an atomic submit RPC.

begin;

-- quiz_takes additions
alter table public.quiz_takes
  add column if not exists submission_hash text;

alter table public.quiz_takes
  add column if not exists overall_score_capped numeric;

alter table public.quiz_takes
  add column if not exists dimension_tiers jsonb;

alter table public.quiz_takes
  add column if not exists critical_threshold numeric;

alter table public.quiz_takes
  add column if not exists cta jsonb;

-- optional: ensure created_at exists
alter table public.quiz_takes
  add column if not exists created_at timestamptz not null default now();

-- answers constraints
alter table public.answers
  alter column time_spent_ms set default 0;

create unique index if not exists quiz_takes_submission_hash_key on public.quiz_takes (submission_hash);
create index if not exists quiz_takes_created_at_idx on public.quiz_takes (created_at);

create unique index if not exists answers_unique_question_per_take
  on public.answers (quiz_take_id, question_id);

-- Atomic submit RPC (best-effort: returns existing token on duplicate submission_hash)
create or replace function public.submit_assessment(
  p_token text,
  p_submission_hash text,
  p_email text,
  p_company text,
  p_overall_score numeric,
  p_overall_score_capped numeric,
  p_overall_level int,
  p_dimension_scores jsonb,
  p_dimension_tiers jsonb,
  p_primary_gap text,
  p_critical_gaps jsonb,
  p_critical_threshold numeric,
  p_cta jsonb,
  p_utm jsonb,
  p_answers jsonb
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_take_id uuid;
  v_token text;
  a jsonb;
begin
  -- idempotency: if we already have this submission_hash, return existing token.
  if p_submission_hash is not null then
    select id, token into v_take_id, v_token
    from public.quiz_takes
    where submission_hash = p_submission_hash
    limit 1;

    if found then
      return jsonb_build_object('token', v_token);
    end if;
  end if;

  insert into public.quiz_takes(
    token,
    submission_hash,
    email,
    company,
    overall_score,
    overall_score_capped,
    overall_level,
    dimension_scores,
    dimension_tiers,
    primary_gap,
    critical_gaps,
    critical_threshold,
    cta,
    utm
  ) values (
    p_token,
    p_submission_hash,
    p_email,
    p_company,
    p_overall_score,
    p_overall_score_capped,
    p_overall_level,
    p_dimension_scores,
    p_dimension_tiers,
    p_primary_gap,
    p_critical_gaps,
    p_critical_threshold,
    p_cta,
    p_utm
  )
  returning id, token into v_take_id, v_token;

  -- Insert answers
  for a in select * from jsonb_array_elements(p_answers)
  loop
    insert into public.answers(quiz_take_id, question_id, option_id, time_spent_ms)
    values (
      v_take_id,
      (a->>'question_id'),
      (a->>'option_id'),
      coalesce((a->>'time_spent_ms')::int, 0)
    );
  end loop;

  return jsonb_build_object('token', v_token);

exception when unique_violation then
  -- race condition on submission_hash: return existing token if present
  if p_submission_hash is not null then
    select token into v_token
    from public.quiz_takes
    where submission_hash = p_submission_hash
    limit 1;

    if v_token is not null then
      return jsonb_build_object('token', v_token);
    end if;
  end if;

  raise;
end;
$$;

-- Allow function execution for service role only (default). If you use RLS, keep strict.
revoke all on function public.submit_assessment(
  text,text,text,text,numeric,numeric,int,jsonb,jsonb,text,jsonb,numeric,jsonb,jsonb,jsonb
) from public;

commit;
