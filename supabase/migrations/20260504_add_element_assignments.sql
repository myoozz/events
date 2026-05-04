create table if not exists element_assignments (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  element_id   uuid not null references elements(id) on delete cascade,
  city         text,
  assigned_to  uuid references auth.users(id) on delete set null,
  assigned_by  uuid references auth.users(id) on delete set null,
  assigned_at  timestamptz not null default now()
);

create unique index if not exists element_assignments_element_city_idx
  on element_assignments (element_id, coalesce(city, ''));

alter table element_assignments enable row level security;

create policy "Authenticated users can read element_assignments"
  on element_assignments for select
  to authenticated using (true);

create policy "Authenticated users can insert element_assignments"
  on element_assignments for insert
  to authenticated with check (true);

create policy "Authenticated users can update element_assignments"
  on element_assignments for update
  to authenticated using (true);
