create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stages (
  id text primary key,
  stage_number integer not null unique check (stage_number between 1 and 40),
  difficulty text not null,
  theme text not null,
  item_count integer not null,
  seed text not null unique,
  solution text[] not null,
  target_guesses integer not null,
  target_time_seconds integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.player_stage_progress (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  stage_id text not null references public.stages(id) on delete cascade,
  completed boolean not null default false,
  stars integer not null default 0 check (stars between 0 and 3),
  best_attempt_count integer,
  best_duration_ms integer,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (player_id, stage_id)
);

create table if not exists public.daily_puzzles (
  id text primary key,
  puzzle_date date not null unique,
  difficulty text not null,
  theme text not null,
  item_count integer not null,
  seed text not null unique,
  solution text[] not null,
  created_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  game_type text not null check (game_type in ('stage', 'daily', 'practice')),
  stage_id text references public.stages(id) on delete set null,
  daily_puzzle_id text references public.daily_puzzles(id) on delete set null,
  difficulty text not null,
  theme text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  attempt_count integer not null default 0,
  duration_ms integer,
  status text not null default 'active' check (status in ('active', 'completed')),
  is_official boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.guesses (
  id uuid primary key default gen_random_uuid(),
  game_session_id uuid not null references public.game_sessions(id) on delete cascade,
  arrangement text[] not null,
  correct_positions integer not null,
  created_at timestamptz not null default now()
);

create unique index if not exists one_official_daily_session_per_player
  on public.game_sessions (player_id, daily_puzzle_id)
  where game_type = 'daily' and is_official = true;

create index if not exists game_sessions_daily_rank_idx on public.game_sessions (daily_puzzle_id, attempt_count, duration_ms)
  where status = 'completed' and is_official = true;
create index if not exists game_sessions_stage_rank_idx on public.game_sessions (stage_id, attempt_count, duration_ms)
  where status = 'completed';
create index if not exists guesses_session_idx on public.guesses (game_session_id, created_at);

alter table public.profiles enable row level security;
alter table public.stages enable row level security;
alter table public.player_stage_progress enable row level security;
alter table public.daily_puzzles enable row level security;
alter table public.game_sessions enable row level security;
alter table public.guesses enable row level security;

drop policy if exists "profiles are self readable" on public.profiles;
create policy "profiles are self readable" on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles are self writable" on public.profiles;
create policy "profiles are self writable" on public.profiles for update using (auth.uid() = id);

drop policy if exists "progress is self readable" on public.player_stage_progress;
create policy "progress is self readable" on public.player_stage_progress for select using (auth.uid() = player_id);

drop policy if exists "sessions are self readable" on public.game_sessions;
create policy "sessions are self readable" on public.game_sessions for select using (auth.uid() = player_id);

drop policy if exists "guesses are self readable" on public.guesses;
create policy "guesses are self readable" on public.guesses
  for select using (
    exists (
      select 1 from public.game_sessions
      where public.game_sessions.id = public.guesses.game_session_id
        and public.game_sessions.player_id = auth.uid()
    )
  );

create or replace function public.hidden_order_theme_items(theme_name text)
returns text[]
language sql
immutable
as $$
  select case theme_name
    when 'fruits' then array['apple','banana','grape','orange','pear','melon','kiwi','cherry','peach','mango','pineapple','strawberry']
    when 'animals' then array['cat','dog','fox','frog','panda','koala','lion','tiger','bear','monkey','rabbit','penguin']
    when 'shapes' then array['circle','square','triangle','diamond','star','heart','hexagon','pentagon','crescent','sun','spark','cross']
    when 'desserts' then array['cake','cookie','donut','pie','cupcake','candy','lollipop','chocolate','icecream','shavedice','pudding','honey']
    else array['soccer','basketball','football','baseball','tennis','volleyball','rugby','pool','hockey','golf','boxing','dart']
  end;
$$;

create or replace function public.hidden_order_seeded_solution(theme_name text, item_count integer, seed_text text)
returns text[]
language sql
immutable
as $$
  with picked as (
    select item
    from unnest(public.hidden_order_theme_items(theme_name)) with ordinality as source(item, ord)
    where ord <= item_count
  )
  select array_agg(item order by md5(seed_text || ':' || item)) from picked;
$$;

insert into public.stages (id, stage_number, difficulty, theme, item_count, seed, solution, target_guesses, target_time_seconds)
select
  'stage-' || stage_number,
  stage_number,
  difficulty,
  theme,
  item_count,
  seed,
  public.hidden_order_seeded_solution(theme, item_count, seed || ':solution'),
  target_guesses,
  target_time_seconds
from (
  select
    stage_number,
    case
      when stage_number <= 5 then 'easy'
      when stage_number <= 10 then 'normal'
      when stage_number <= 15 then 'medium'
      when stage_number <= 20 then 'hard'
      when stage_number <= 25 then 'expert'
      when stage_number <= 30 then 'master'
      when stage_number <= 35 then 'extreme'
      else 'legend'
    end as difficulty,
    (array['fruits','animals','shapes','desserts','sports'])[1 + ((stage_number - 1) % 5)] as theme,
    (array[4,5,6,7,8,9,10,12])[1 + ((stage_number - 1) / 5)] as item_count,
    (array[5,7,9,11,13,15,17,22])[1 + ((stage_number - 1) / 5)] as target_guesses,
    (array[45,70,95,125,160,200,250,330])[1 + ((stage_number - 1) / 5)] as target_time_seconds,
    'hidden-order:stage:' || stage_number as seed
  from generate_series(1, 40) as stage_number
) seed_rows
on conflict (id) do update set
  difficulty = excluded.difficulty,
  theme = excluded.theme,
  item_count = excluded.item_count,
  seed = excluded.seed,
  solution = excluded.solution,
  target_guesses = excluded.target_guesses,
  target_time_seconds = excluded.target_time_seconds;
