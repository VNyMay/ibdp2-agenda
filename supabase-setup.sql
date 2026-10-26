-- IBDP2 Agenda: database setup for Supabase.
--
-- Run this whole file once: Supabase dashboard > SQL Editor > New query > paste > Run.
-- It is safe to run again later (for example after an update); it keeps everything already on the agenda.
--
-- After it finishes, set the class code by running this one line on its own
-- (type it in the SQL editor, never into this file, because this file is public on the website):
--
--   select private.set_class_code('pick-something-hard-to-guess');
--
-- How it is protected: anyone can READ the agenda, but nobody can change a table directly.
-- Every change goes through the functions below, which check the class code first.
-- The code is stored hashed in a private schema that the website can never read.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- private settings
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.settings (
  key text primary key,
  value text not null
);
alter table private.settings enable row level security;

-- ---------------------------------------------------------------- tables
create table if not exists public.subjects (
  id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  name text not null check (char_length(name) between 1 and 60),
  short text not null check (char_length(short) between 1 and 24),
  code text not null check (char_length(code) between 1 and 6),
  fam text not null check (fam in ('core', 'lang', 'soc', 'sci', 'math', 'school')),
  sort integer not null default 100,
  created_at timestamptz not null default now()
);

-- One row per agenda entry: homework, a test, a deadline, an event or a reminder.
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  subject text not null references public.subjects (id),
  kind text not null default 'hw' check (kind in ('hw', 'test', 'deadline', 'event', 'reminder')),
  title text not null check (char_length(title) between 1 and 120),
  notes text not null default '' check (char_length(notes) <= 1000),
  start_date date not null,
  end_date date check (end_date is null or end_date > start_date),
  at_time text check (at_time is null or at_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  place text not null default '' check (char_length(place) <= 80),
  level text not null default '' check (level in ('', 'HL', 'SL')),
  important boolean not null default false,
  added_by text not null default '' check (char_length(added_by) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists items_start_idx on public.items (start_date);

-- Every change is written here, so the class can see who did what and undo deletes.
create table if not exists public.changes (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  action text not null check (action in ('add', 'edit', 'delete', 'restore', 'subject')),
  who text not null default '',
  item_id uuid,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists changes_at_idx on public.changes (at desc);

-- ---------------------------------------------------------------- read-only access for visitors
alter table public.subjects enable row level security;
alter table public.items enable row level security;
alter table public.changes enable row level security;

drop policy if exists "Anyone can read subjects" on public.subjects;
create policy "Anyone can read subjects" on public.subjects for select to anon, authenticated using (true);
drop policy if exists "Anyone can read items" on public.items;
create policy "Anyone can read items" on public.items for select to anon, authenticated using (true);
drop policy if exists "Anyone can read changes" on public.changes;
create policy "Anyone can read changes" on public.changes for select to anon, authenticated using (true);

revoke insert, update, delete, truncate on public.subjects, public.items, public.changes from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.subjects, public.items, public.changes to anon, authenticated;

-- ---------------------------------------------------------------- class code
create or replace function private.code_ok(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.settings
    where key = 'class_code'
      and value = extensions.crypt(btrim(coalesce(p_code, '')), value)
  );
$$;

create or replace function private.set_class_code(p_new text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_new is null or char_length(btrim(p_new)) < 6 then
    raise exception 'Pick a class code with at least 6 characters.';
  end if;
  insert into private.settings (key, value)
  values ('class_code', extensions.crypt(btrim(p_new), extensions.gen_salt('bf')))
  on conflict (key) do update set value = excluded.value;
  return 'Class code saved. Share it in the group chat.';
end;
$$;

revoke all on function private.code_ok(text) from public, anon, authenticated;
revoke all on function private.set_class_code(text) from public, anon, authenticated;

-- ---------------------------------------------------------------- what the website can call
create or replace function public.check_code(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.code_ok(p_code);
$$;

create or replace function public.add_item(
  p_code text, p_subject text, p_kind text, p_title text, p_notes text,
  p_start date, p_end date, p_time text, p_place text, p_level text, p_important boolean, p_by text
)
returns public.items
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.items;
begin
  if not private.code_ok(p_code) then
    raise exception 'wrong_code';
  end if;
  insert into public.items (subject, kind, title, notes, start_date, end_date, at_time, place, level, important, added_by)
  values (
    p_subject, coalesce(nullif(p_kind, ''), 'hw'), btrim(p_title), btrim(coalesce(p_notes, '')),
    p_start, nullif(p_end, p_start), nullif(btrim(coalesce(p_time, '')), ''), btrim(coalesce(p_place, '')),
    coalesce(p_level, ''), coalesce(p_important, false), left(btrim(coalesce(p_by, '')), 40)
  )
  returning * into t;
  insert into public.changes (action, who, item_id, detail)
  values ('add', t.added_by, t.id, to_jsonb(t));
  return t;
end;
$$;

create or replace function public.update_item(
  p_code text, p_id uuid, p_subject text, p_kind text, p_title text, p_notes text,
  p_start date, p_end date, p_time text, p_place text, p_level text, p_important boolean, p_by text
)
returns public.items
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row public.items;
  t public.items;
begin
  if not private.code_ok(p_code) then
    raise exception 'wrong_code';
  end if;
  select * into old_row from public.items where id = p_id;
  if not found then
    raise exception 'not_found';
  end if;
  update public.items
  set subject = p_subject,
      kind = coalesce(nullif(p_kind, ''), 'hw'),
      title = btrim(p_title),
      notes = btrim(coalesce(p_notes, '')),
      start_date = p_start,
      end_date = nullif(p_end, p_start),
      at_time = nullif(btrim(coalesce(p_time, '')), ''),
      place = btrim(coalesce(p_place, '')),
      level = coalesce(p_level, ''),
      important = coalesce(p_important, false),
      updated_at = now()
  where id = p_id
  returning * into t;
  insert into public.changes (action, who, item_id, detail)
  values ('edit', left(btrim(coalesce(p_by, '')), 40), t.id, jsonb_build_object('before', to_jsonb(old_row), 'after', to_jsonb(t)));
  return t;
end;
$$;

create or replace function public.delete_item(p_code text, p_id uuid, p_by text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row public.items;
begin
  if not private.code_ok(p_code) then
    raise exception 'wrong_code';
  end if;
  delete from public.items where id = p_id returning * into old_row;
  if not found then
    raise exception 'not_found';
  end if;
  insert into public.changes (action, who, item_id, detail)
  values ('delete', left(btrim(coalesce(p_by, '')), 40), old_row.id, to_jsonb(old_row));
end;
$$;

create or replace function public.restore_item(p_code text, p_change_id bigint, p_by text)
returns public.items
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.changes;
  t public.items;
begin
  if not private.code_ok(p_code) then
    raise exception 'wrong_code';
  end if;
  select * into c from public.changes where id = p_change_id and action = 'delete';
  if not found then
    raise exception 'not_found';
  end if;
  if exists (select 1 from public.items where id = c.item_id) then
    raise exception 'already_restored';
  end if;
  insert into public.items (id, subject, kind, title, notes, start_date, end_date, at_time, place, level, important, added_by, created_at)
  values (
    c.item_id,
    c.detail ->> 'subject',
    coalesce(c.detail ->> 'kind', 'hw'),
    c.detail ->> 'title',
    coalesce(c.detail ->> 'notes', ''),
    (c.detail ->> 'start_date')::date,
    (c.detail ->> 'end_date')::date,
    c.detail ->> 'at_time',
    coalesce(c.detail ->> 'place', ''),
    coalesce(c.detail ->> 'level', ''),
    coalesce((c.detail ->> 'important')::boolean, false),
    coalesce(c.detail ->> 'added_by', ''),
    coalesce((c.detail ->> 'created_at')::timestamptz, now())
  )
  returning * into t;
  insert into public.changes (action, who, item_id, detail)
  values ('restore', left(btrim(coalesce(p_by, '')), 40), t.id, to_jsonb(t));
  return t;
end;
$$;

create or replace function public.add_subject(
  p_code text, p_name text, p_short text, p_label text, p_fam text, p_by text
)
returns public.subjects
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_base text;
  v_id text;
  v_label text;
  n integer := 2;
  s public.subjects;
begin
  if not private.code_ok(p_code) then
    raise exception 'wrong_code';
  end if;
  if v_name = '' then
    raise exception 'missing_name';
  end if;
  if exists (select 1 from public.subjects where lower(name) = lower(v_name)) then
    raise exception 'subject_exists';
  end if;
  v_base := btrim(left(lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g')), 24), '-');
  if v_base = '' then
    v_base := 'subject';
  end if;
  v_id := v_base;
  while exists (select 1 from public.subjects where id = v_id) loop
    v_id := v_base || '-' || n;
    n := n + 1;
  end loop;
  v_label := upper(left(coalesce(nullif(regexp_replace(coalesce(p_label, ''), '[^A-Za-z0-9]', '', 'g'), ''),
                                 nullif(regexp_replace(v_name, '[^A-Za-z0-9]', '', 'g'), ''),
                                 'SUBJ'), 6));
  insert into public.subjects (id, name, short, code, fam, sort)
  values (v_id, left(v_name, 60), left(coalesce(nullif(btrim(p_short), ''), v_name), 24), v_label,
          case when p_fam in ('core', 'lang', 'soc', 'sci', 'math', 'school') then p_fam else 'school' end, 50)
  returning * into s;
  insert into public.changes (action, who, item_id, detail)
  values ('subject', left(btrim(coalesce(p_by, '')), 40), null, to_jsonb(s));
  return s;
end;
$$;

revoke all on function public.check_code(text) from public;
revoke all on function public.add_item(text, text, text, text, text, date, date, text, text, text, boolean, text) from public;
revoke all on function public.update_item(text, uuid, text, text, text, text, date, date, text, text, text, boolean, text) from public;
revoke all on function public.delete_item(text, uuid, text) from public;
revoke all on function public.restore_item(text, bigint, text) from public;
revoke all on function public.add_subject(text, text, text, text, text, text) from public;
grant execute on function public.check_code(text) to anon, authenticated;
grant execute on function public.add_item(text, text, text, text, text, date, date, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.update_item(text, uuid, text, text, text, text, date, date, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.delete_item(text, uuid, text) to anon, authenticated;
grant execute on function public.restore_item(text, bigint, text) to anon, authenticated;
grant execute on function public.add_subject(text, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- live updates
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  begin
    alter publication supabase_realtime add table public.items;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.subjects;
  exception when duplicate_object then null;
  end;
end;
$$;

-- ---------------------------------------------------------------- starting data
insert into public.subjects (id, name, short, code, fam, sort) values
  ('tok', 'Theory of Knowledge', 'TOK', 'TOK', 'core', 1),
  ('cas', 'Creativity, Activity, Service', 'CAS', 'CAS', 'core', 2),
  ('ee', 'Extended Essay', 'EE', 'EE', 'core', 3),
  ('eng', 'English Language & Literature', 'English', 'ENG', 'lang', 1),
  ('ara', 'Arabic Language', 'Arabic', 'ARA', 'lang', 2),
  ('bm', 'Business Management', 'Business', 'BM', 'soc', 1),
  ('ds', 'Digital Society', 'Digital Society', 'DS', 'soc', 2),
  ('phy', 'Physics', 'Physics', 'PHY', 'sci', 1),
  ('bio', 'Biology', 'Biology', 'BIO', 'sci', 2),
  ('chem', 'Chemistry', 'Chemistry', 'CHEM', 'sci', 3),
  ('cs', 'Computer Science', 'Computer Science', 'CS', 'sci', 4),
  ('maa', 'Maths: Analysis & Approaches', 'Maths AA', 'MAA', 'math', 1),
  ('mai', 'Maths: Applications & Interpretation', 'Maths AI', 'MAI', 'math', 2),
  ('civ', 'Civics', 'Civics', 'CIV', 'school', 1),
  ('class', 'Whole class', 'Class', 'CLASS', 'school', 999)
on conflict (id) do nothing;

-- The entries from the first version of the sheet (week of Oct 26, 2026). Only added to an empty agenda.
insert into public.items (subject, kind, title, notes, start_date, important)
select v.subject, v.kind, v.title, v.notes, v.start_date::date, v.important
from (values
  ('cas', 'hw', 'Pizza ingredients', 'Continue filling out the feedback sheet.', '2026-10-27', false),
  ('tok', 'hw', 'Exhibition presentation', 'Finish your three-minute presentation about your exhibition project. More details on IB News!', '2026-10-28', false),
  ('ara', 'hw', 'Activity 6 and the first 8 lines', 'Do activity 6 in the poem (more details on IB News), and memorise the first 8 lines of the poem.', '2026-10-28', true),
  ('phy', 'hw', 'Exercises 24 to 30 and 35 to 37', 'Prepare the exercises on pages 404 to 406.', '2026-10-28', false),
  ('civ', 'hw', 'Civics homework', 'Check the groups for more info (no one''s doing it).', '2026-10-28', false),
  ('class', 'event', 'Parent orientation', 'Check ibdp2 for more info.', '2026-10-28', false)
) as v (subject, kind, title, notes, start_date, important)
where not exists (select 1 from public.items);

notify pgrst, 'reload schema';
