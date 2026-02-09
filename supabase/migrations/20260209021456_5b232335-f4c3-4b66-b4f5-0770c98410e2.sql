-- Enable realtime for wapi_messages and wapi_conversations tables
-- This adds the tables to the supabase_realtime publication so changes are broadcast via websocket

ALTER PUBLICATION supabase_realtime ADD TABLE wapi_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE wapi_conversations;