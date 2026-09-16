-- ============================================================================
-- Cierra el EXECUTE de las funciones al rol anon.
--
-- Lo detectó el linter de Supabase sobre el proyecto real: el «revoke ... from
-- anon» de la migración 0001 no bastaba. Postgres concede EXECUTE sobre las
-- funciones al pseudo-rol PUBLIC por defecto, y anon hereda de PUBLIC, así que
-- seguían siendo invocables sin sesión vía /rest/v1/rpc/.
--
-- No había agujero explotable —create_club_with_team aborta si auth.uid() es
-- nulo, y las otras dos solo devuelven un booleano sobre el propio usuario—,
-- pero la superficie no tenía por qué estar abierta.
-- ============================================================================

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

grant execute on function public.create_club_with_team(text, text, text, text) to authenticated;
grant execute on function public.is_club_member(uuid) to authenticated;
grant execute on function public.is_team_member(uuid) to authenticated;

-- Y que las funciones futuras no vuelvan a nacer abiertas.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;
