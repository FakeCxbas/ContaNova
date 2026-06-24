alter table public.profiles
  add column if not exists welcome_shown_at timestamptz;

comment on column public.profiles.welcome_shown_at is
  'Fecha en que se mostro el mensaje de bienvenida inicial al usuario.';
