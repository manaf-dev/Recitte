-- The one settings row and the seven social platforms. These are part of the
-- schema rather than seed.sql so production gets them from `supabase db push`.
-- No programs or testimonials are seeded.

insert into public.settings (id, hero_title, hero_intro, email, phone, whatsapp, community_link)
values (
  true,
  'Spend at least 5 minutes with the Qur''an today.',
  'Recitte helps Muslims build a consistent, meaningful connection with the Book of Allah, through community, structured learning and small daily actions.',
  'salman@recitte.org',
  '',
  '+233 54 063 4141',
  ''
)
on conflict (id) do nothing;

insert into public.social_links (platform, url, active, sort_order)
values
  ('whatsapp', '', false, 1),
  ('instagram', '', false, 2),
  ('facebook', '', false, 3),
  ('tiktok', '', false, 4),
  ('youtube', '', false, 5),
  ('x', '', false, 6),
  ('telegram', '', false, 7)
on conflict (platform) do nothing;
