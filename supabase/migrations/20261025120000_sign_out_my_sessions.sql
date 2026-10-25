-- Signs the caller out of the sessions they pick from the settings list.
-- Supabase's API can only end the current session or all of them at once, so
-- this deletes the chosen rows from auth.sessions directly; their refresh
-- tokens go with them (on delete cascade), so those devices can't renew.
--
-- security definer to reach the auth schema, and pinned to auth.uid(): ids of
-- someone else's sessions match nothing. The current session is never ended
-- here; signing out of this device has its own button.

create function public.sign_out_my_sessions(session_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  ended integer;
begin
  delete from auth.sessions s
  where s.id = any (session_ids)
    and s.user_id = (select auth.uid())
    and s.id::text is distinct from (select auth.jwt() ->> 'session_id');
  get diagnostics ended = row_count;
  return ended;
end;
$$;

revoke execute on function public.sign_out_my_sessions(uuid[]) from public, anon;
grant execute on function public.sign_out_my_sessions(uuid[]) to authenticated;
