-- supabase/migrations/20260612_injury_structured_fields.sql
alter table public.injuries
  add column if not exists body_region              text,
  add column if not exists body_part_key            text,
  add column if not exists side                     text,
  add column if not exists diagnosis_key            text,
  add column if not exists physio_seen              boolean not null default false,
  add column if not exists rehab_phase              text not null default 'protect',
  add column if not exists symptom_flags            jsonb not null default '{}'::jsonb,
  add column if not exists red_flag_triggered       boolean not null default false,
  add column if not exists referred_to_professional boolean not null default false,
  add column if not exists prevention_exercises     jsonb not null default '[]'::jsonb;
