CREATE OR REPLACE FUNCTION notify_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
declare
  payload jsonb;
  notif_title text;
  notif_body text;
  notif_tag text;
begin
  if NEW.type = 'new_like' then
    notif_title := 'Quelqu''un t''a liké !';
    notif_body  := 'Quelqu''un a aimé ton profil.';
    notif_tag   := 'like';
  elsif NEW.type = 'new_match' then
    notif_title := 'Nouveau match !';
    notif_body  := 'Vous vous êtes matchés !';
    notif_tag   := 'match';
  elsif NEW.type = 'new_message' then
    notif_title := 'Nouveau message';
    notif_body  := coalesce(NEW.message, 'Tu as un nouveau message');
    notif_tag   := 'message';
  else
    return NEW;
  end if;

  payload := jsonb_build_object(
    'user_id', NEW.user_id,
    'title',   notif_title,
    'body',    notif_body,
    'tag',     notif_tag,
    'data',    jsonb_build_object('type', NEW.type, 'notification_id', NEW.id)
  );

  perform net.http_post(
    url     := 'https://coytzhvhksalobmdnzwr.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXR6aHZoa3NhbG9ibWRuendyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE1ODUyOCwiZXhwIjoyMDc5NzM0NTI4fQ.MaecwjhOTsF2t-U_tnGmynu-fVxQQv9Uyd7qE88Ibgk'
    ),
    body    := payload
  );

  return NEW;
end;
$func$;
