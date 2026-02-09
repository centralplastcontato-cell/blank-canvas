import { useEffect, useRef, useCallback } from "react";
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
  enabled?: boolean;
}

/**
 * Robust realtime hook for WhatsApp messages.
 * 
 * Key features:
 * - Properly recreates channel when conversation changes
 * - Handles channel errors and reconnection
 * - Uses stable callback refs to prevent stale closures
 * - Logs channel status for debugging
 */
export function useMessagesRealtime({
  conversationId,
  onNewMessage,
  enabled = true,
}: UseMessagesRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentConversationIdRef = useRef<string | null>(null);
  
  // Use ref for callback to avoid stale closures
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      console.log("[MessagesRealtime] Cleaning up channel for:", currentConversationIdRef.current);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const setupChannel = useCallback((convId: string) => {
    // Clean up existing channel first
    cleanup();

    const channelName = `messages_realtime_${convId}_${Date.now()}`;
    console.log("[MessagesRealtime] Creating channel:", channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wapi_messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          console.log("[MessagesRealtime] INSERT received:", payload.new);
          const newMessage = payload.new as Message;
          
          // Use ref to get latest callback
          onNewMessageRef.current(newMessage);
        }
      )
      .subscribe((status, err) => {
        console.log("[MessagesRealtime] Channel status:", status, err || "");
        
        if (status === "CHANNEL_ERROR") {
          console.error("[MessagesRealtime] Channel error, will retry in 2s");
          // Retry after a delay
          setTimeout(() => {
            if (currentConversationIdRef.current === convId) {
              console.log("[MessagesRealtime] Retrying channel setup");
              setupChannel(convId);
            }
          }, 2000);
        }
      });

    channelRef.current = channel;
    currentConversationIdRef.current = convId;
  }, [cleanup]);

  useEffect(() => {
    if (!enabled || !conversationId) {
      cleanup();
      currentConversationIdRef.current = null;
      return;
    }

    // Only recreate if conversation actually changed
    if (currentConversationIdRef.current !== conversationId) {
      setupChannel(conversationId);
    }

    return () => {
      // Only cleanup on unmount or when conversation changes to null
      // The actual cleanup for conversation changes is handled in setupChannel
    };
  }, [conversationId, enabled, setupChannel, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isSubscribed: channelRef.current !== null,
  };
}
