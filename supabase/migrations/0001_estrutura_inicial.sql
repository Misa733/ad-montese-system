-- Estrutura inicial do banco do Sistema AD Montese.
-- Rode este arquivo uma vez no SQL Editor do Supabase (ou via `supabase db push`).
--
-- Visao geral:
--   profiles     -> usuarios do sistema, com perfil de acesso e status de aprovacao
--   settings     -> configuracoes globais (link da planilha, fonte de dados, modo demo)
--   app_records  -> cadastros feitos no sistema (patrimonio, dizimos, rascunhos...)
--   sheet_tabs   -> abas da planilha importadas para o banco
--   sheet_rows   -> linhas dessas abas (a "planilha dentro do banco")
--   audit_log    -> historico de quem alterou o que

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Perfis de usuario
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'leitura'
    check (role in ('admin', 'secretaria', 'tesouraria', 'patrimonio', 'leitura')),
  status text not null default 'pendente'
    check (status in ('pendente', 'ativo', 'bloqueado')),
  congregation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- O primeiro usuario cadastrado vira administrador ativo; os demais entram como
-- "pendente" e so acessam depois que um administrador aprovar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when is_first then 'admin' else 'leitura' end,
    case when is_first then 'ativo' else 'pendente' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Funcoes auxiliares usadas pelas politicas de seguranca (RLS).
create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and status = 'ativo'
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'ativo')
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_name() = 'admin', false)
$$;

-- Quem pode gravar em cada colecao de cadastros do sistema.
create or replace function public.can_write_collection(collection text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.current_role_name() is null then false
    when public.current_role_name() = 'admin' then true
    when collection like 'patrimony.%' then public.current_role_name() = 'patrimonio'
    when collection like 'tithe.%' then public.current_role_name() = 'tesouraria'
    when collection = 'sheet.drafts' then public.current_role_name() <> 'leitura'
    else false
  end
$$;

alter table public.profiles enable row level security;

drop policy if exists "perfil: ler o proprio ou admin" on public.profiles;
create policy "perfil: ler o proprio ou admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "perfil: admin altera" on public.profiles;
create policy "perfil: admin altera" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- Usuario comum pode alterar so o proprio nome; perfil e status ficam com o admin.
drop policy if exists "perfil: usuario altera o proprio nome" on public.profiles;
create policy "perfil: usuario altera o proprio nome" on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and status = (select p.status from public.profiles p where p.id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Configuracoes globais
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

alter table public.settings enable row level security;

drop policy if exists "config: usuarios ativos leem" on public.settings;
create policy "config: usuarios ativos leem" on public.settings
  for select using (public.is_active_user());

drop policy if exists "config: admin grava" on public.settings;
create policy "config: admin grava" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.settings (key, value) values
  ('spreadsheet_url', to_jsonb(''::text)),
  ('data_source', to_jsonb('google'::text)),
  ('demo_mode', to_jsonb(false))
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Cadastros feitos no sistema
-- ---------------------------------------------------------------------------
create table if not exists public.app_records (
  collection text not null,
  id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) default auth.uid(),
  updated_by uuid references auth.users (id) default auth.uid(),
  primary key (collection, id)
);

create index if not exists app_records_collection_idx on public.app_records (collection, updated_at desc);

alter table public.app_records enable row level security;

drop policy if exists "cadastros: usuarios ativos leem" on public.app_records;
create policy "cadastros: usuarios ativos leem" on public.app_records
  for select using (public.is_active_user());

drop policy if exists "cadastros: inclui conforme perfil" on public.app_records;
create policy "cadastros: inclui conforme perfil" on public.app_records
  for insert with check (public.can_write_collection(collection));

drop policy if exists "cadastros: altera conforme perfil" on public.app_records;
create policy "cadastros: altera conforme perfil" on public.app_records
  for update using (public.can_write_collection(collection))
  with check (public.can_write_collection(collection));

drop policy if exists "cadastros: exclui conforme perfil" on public.app_records;
create policy "cadastros: exclui conforme perfil" on public.app_records
  for delete using (public.can_write_collection(collection));

-- ---------------------------------------------------------------------------
-- Planilha importada para o banco
-- ---------------------------------------------------------------------------
create table if not exists public.sheet_tabs (
  id text primary key,
  title text not null,
  position integer not null default 0,
  imported_at timestamptz not null default now()
);

create table if not exists public.sheet_rows (
  id bigint generated always as identity primary key,
  tab_id text not null references public.sheet_tabs (id) on delete cascade,
  row_index integer not null,
  cells jsonb not null,
  source text not null default 'planilha' check (source in ('planilha', 'sistema')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) default auth.uid()
);

create index if not exists sheet_rows_tab_idx on public.sheet_rows (tab_id, row_index, id);

alter table public.sheet_tabs enable row level security;
alter table public.sheet_rows enable row level security;

drop policy if exists "abas: usuarios ativos leem" on public.sheet_tabs;
create policy "abas: usuarios ativos leem" on public.sheet_tabs
  for select using (public.is_active_user());

drop policy if exists "abas: admin grava" on public.sheet_tabs;
create policy "abas: admin grava" on public.sheet_tabs
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "linhas: usuarios ativos leem" on public.sheet_rows;
create policy "linhas: usuarios ativos leem" on public.sheet_rows
  for select using (public.is_active_user());

drop policy if exists "linhas: admin importa" on public.sheet_rows;
create policy "linhas: admin importa" on public.sheet_rows
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "linhas: equipe inclui pelo sistema" on public.sheet_rows;
create policy "linhas: equipe inclui pelo sistema" on public.sheet_rows
  for insert with check (
    source = 'sistema'
    and coalesce(public.current_role_name(), 'leitura') <> 'leitura'
  );

-- ---------------------------------------------------------------------------
-- Historico de alteracoes
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_key text not null,
  action text not null,
  actor uuid,
  actor_email text,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

drop policy if exists "historico: admin le" on public.audit_log;
create policy "historico: admin le" on public.audit_log
  for select using (public.is_admin());

create or replace function public.write_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  record_key text;
begin
  if tg_table_name = 'app_records' then
    record_key := coalesce(new.collection, old.collection) || ':' || coalesce(new.id, old.id);
  elsif tg_table_name = 'settings' then
    record_key := coalesce(new.key, old.key);
  elsif tg_table_name = 'profiles' then
    record_key := coalesce(new.email, old.email);
  else
    record_key := '';
  end if;

  insert into public.audit_log (table_name, record_key, action, actor, actor_email)
  values (
    tg_table_name,
    record_key,
    lower(tg_op),
    auth.uid(),
    (select email from public.profiles where id = auth.uid())
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_app_records on public.app_records;
create trigger audit_app_records after insert or update or delete on public.app_records
  for each row execute function public.write_audit();

drop trigger if exists audit_settings on public.settings;
create trigger audit_settings after insert or update or delete on public.settings
  for each row execute function public.write_audit();

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles after update on public.profiles
  for each row execute function public.write_audit();

-- Mantem updated_at em dia.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_app_records on public.app_records;
create trigger touch_app_records before update on public.app_records
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_profiles on public.profiles;
create trigger touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_settings on public.settings;
create trigger touch_settings before update on public.settings
  for each row execute function public.touch_updated_at();
