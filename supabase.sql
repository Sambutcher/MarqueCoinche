-- À exécuter dans l'éditeur SQL de Supabase (une seule fois).
create table if not exists tables (
	code text primary key check (code ~ '^[0-9]{4}$'),
	donnes jsonb not null default '[]',
	donneur int not null default 0,
	en_cours jsonb,
	joueurs jsonb not null default '["","","",""]',
	maj timestamptz not null default now()
);

alter table tables enable row level security;

create policy "lecture publique" on tables for select to anon using (true);
create policy "creation publique" on tables for insert to anon with check (true);
create policy "mise a jour publique" on tables for update to anon using (true) with check (true);

-- Si la table existait déjà avant l'ajout des noms de joueurs, exécuter aussi :
alter table tables add column if not exists joueurs jsonb not null default '["","","",""]';
