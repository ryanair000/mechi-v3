CREATE OR REPLACE FUNCTION public.record_passport_comparison_invitation_visit(
  p_token uuid,
  p_left_user_id uuid,
  p_right_user_id uuid
)
RETURNS TABLE (invitation_id uuid)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  UPDATE public.passport_comparison_invitations invitation
  SET
    visit_count = invitation.visit_count + 1,
    first_visited_at = coalesce(invitation.first_visited_at, timezone('utc', now())),
    last_visited_at = timezone('utc', now())
  WHERE invitation.token = p_token
    AND invitation.expires_at > timezone('utc', now())
    AND p_left_user_id <> p_right_user_id
    AND invitation.creator_id IN (p_left_user_id, p_right_user_id)
    AND invitation.target_user_id IN (p_left_user_id, p_right_user_id)
  RETURNING invitation.id;
$$;

REVOKE ALL ON FUNCTION public.record_passport_comparison_invitation_visit(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_passport_comparison_invitation_visit(uuid, uuid, uuid)
  TO service_role;
