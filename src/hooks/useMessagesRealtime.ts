import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Message {
  id: string;
  conversation_id: string;
  message_id: string | null;
  from_me: boolean;
  message_type: string;
  content: string | null;
  media_url: string | null;
  status: string;
  timestamp: string;
}

interface UseMessagesRealtimeOptions {
  conversationId: string | null;
  onNewMessage: (message: Message) => void;
  onMessageUpdate?: (message: Message) => void;
  enabled?: boolean;
}

export function useMessagesRealtime({
  conversationId,
  onNewMessage,
  onMessageUpdate,
  enabled = true,
}: UseMessagesRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageUpdateRef = useRef(onMessageUpdate);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  onNewMessageRef.current = onNewMessage;
  onMessageUpdateRef.current = onMessageUpdate;

  useEffect(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!enabled || !conversationId) return;

    const channelName = `msg_rt_${conversationId}_${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wapi_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          (newMessage as Message & { _realtimeReceivedAt?: number })._realtimeReceivedAt = Date.now();
          onNewMessageRef.current(newMessage);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wapi_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          onMessageUpdateRef.current?.(updatedMessage);
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          retryTimeoutRef.current = setTimeout(() => {
            if (channelRef.current) {
              supabase.removeChannel(channelRef.current);
              channelRef.current = null;
            }
          }, 3000);
        }
      });

    channelRef.current = channel;

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, enabled]);

  return { isSubscribed: channelRef.current !== null };
}
