-- Phase 2A: schema เริ่มต้นสำหรับ Personal Health & Habit Tracker
-- รันใน Supabase Dashboard > SQL Editor (หรือ supabase db push)
-- แนวคิด: 1 ผู้ใช้ = 1 แถวใน auth.users (Supabase Auth, ใช้ Anonymous sign-in ได้ก่อน)
-- ทุกตารางมี RLS: ผู้ใช้เห็น/แก้ได้เฉพาะข้อมูลของตัวเอง

-- 1) users: โปรไฟล์ผู้ใช้ (ผูกกับ auth.users)
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- 2) health_logs: Daily Check-in (1 แถวต่อผู้ใช้ต่อวัน ตรงกับ localStorage health_checkins)
create table public.health_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  log_date date not null,
  sleep_hours numeric(3,1) not null check (sleep_hours >= 0 and sleep_hours <= 24),
  water_glasses integer not null check (water_glasses >= 0),
  exercise_minutes integer not null check (exercise_minutes >= 0),
  mood text not null check (mood in ('good', 'normal', 'bad')),
  food_quality text not null check (food_quality in ('good', 'normal', 'bad')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- 3) habits: รายการ habit (ตรงกับ health_habits)
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now()
);
create unique index habits_user_name_uniq on public.habits (user_id, lower(btrim(name)));

-- 4) habit_logs: มีแถว = ทำ habit นั้นแล้วในวันนั้น (ตรงกับ health_habit_logs)
create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  log_date date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);
create index habit_logs_user_date_idx on public.habit_logs (user_id, log_date);

-- 5) ai_memories: เตรียมไว้ให้ Smart Memory (Phase ถัดไป) - ตอนนี้ยังไม่มี logic ใด ๆ ใช้
create table public.ai_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  content text not null,
  category text,
  source_date date,
  created_at timestamptz not null default now()
);
create index ai_memories_user_idx on public.ai_memories (user_id, created_at desc);

-- updated_at อัตโนมัติสำหรับ health_logs
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger health_logs_updated_at before update on public.health_logs
  for each row execute function public.set_updated_at();

-- เมื่อมีผู้ใช้ใหม่ใน auth.users: สร้างแถว users + habit เริ่มต้น 3 อัน
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id) values (new.id);
  insert into public.habits (user_id, name) values
    (new.id, 'Drink Water'), (new.id, 'Exercise'), (new.id, 'Sleep Before 23:00');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security: เห็น/แก้ได้เฉพาะข้อมูลของตัวเอง
alter table public.users enable row level security;
alter table public.health_logs enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.ai_memories enable row level security;

create policy "own profile" on public.users for all
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "own health_logs" on public.health_logs for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own habits" on public.habits for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own habit_logs" on public.habit_logs for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own ai_memories" on public.ai_memories for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
