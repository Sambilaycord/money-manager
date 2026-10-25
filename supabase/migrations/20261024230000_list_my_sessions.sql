-- The signed-in user's own sessions, for the "where you're signed in" list in
-- settings. auth.sessions isn't exposed through the API, so this reads it as
-- the function owner (security definer) and is pinned to auth.uid(): it can
-- only ever return the caller's sessions. Only device and timing details come
-- back; tokens and IP addresses stay inside auth.

create function public.list_my_sessions()
returns table (
  id uuid,
  user_agent text,
  created_at timestamptz,
  last_active_at timestamptz,
  is_current boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.user_agent,
    s.created_at,
    -- refreshed_at is stored without a time zone, in UTC.
    greatest(s.updated_at, (s.refreshed_at at time zone 'UTC'), s.created_at) as last_active_at,
    s.id::text = (select auth.jwt() ->> 'session_id') as is_current
  from auth.sessions s
  where s.user_id = (select auth.uid())
    and (s.not_after is null or s.not_after > now())
  order by last_active_at desc;
$$;

-- Supabase grants new functions to anon by default; signed-out callers have no
-- sessions to list.
revoke execute on function public.list_my_sessions() from public, anon;
grant execute on function public.list_my_sessions() to authenticated;
