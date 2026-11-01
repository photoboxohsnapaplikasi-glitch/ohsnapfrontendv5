-- Jalankan di Supabase Dashboard > SQL Editor (sekali saja)

-- 1) Tabel data CMS
create table if not exists public.cms_settings (
  id int primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table public.cms_settings enable row level security;

drop policy if exists "cms public read"   on public.cms_settings;
drop policy if exists "cms public insert" on public.cms_settings;
drop policy if exists "cms public update" on public.cms_settings;
create policy "cms public read"   on public.cms_settings for select using (true);
create policy "cms public insert" on public.cms_settings for insert with check (id = 1);
create policy "cms public update" on public.cms_settings for update using (id = 1) with check (id = 1);

-- 2) Bucket penyimpanan foto & video (public agar bisa tampil di semua device)
insert into storage.buckets (id, name, public)
values ('ohsnap-media', 'ohsnap-media', true)
on conflict (id) do update set public = true;

drop policy if exists "media public read"   on storage.objects;
drop policy if exists "media public upload" on storage.objects;
create policy "media public read"   on storage.objects for select using (bucket_id = 'ohsnap-media');
create policy "media public upload" on storage.objects for insert with check (bucket_id = 'ohsnap-media');
