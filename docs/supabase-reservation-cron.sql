-- GILUXY reservation monitor scheduler
--
-- Run this in Supabase SQL Editor.
-- It makes Supabase Postgres call the deployed Vercel monitor endpoint every 2 hours.
-- The cron expression is UTC. `17 */2 * * *` runs at KST 01:17, 03:17, ... 23:17.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('giluxy-reservation-monitor-2h');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'giluxy-reservation-monitor-2h',
  '17 */2 * * *',
  $$
    select net.http_get(
      url := 'https://giluxy.vercel.app/api/run-reservation-monitors',
      headers := jsonb_build_object('User-Agent', 'supabase-pg-cron'),
      timeout_milliseconds := 60000
    ) as request_id;
  $$
);

-- Check scheduled jobs:
-- select * from cron.job order by jobid desc;

-- Check recent HTTP responses:
-- select id, status_code, error_msg, created
-- from net._http_response
-- order by created desc
-- limit 20;
