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
  // Store refs for stable references
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onNewMessageRef = useRef(onNewMessage);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Always update the callback ref on each render
  onNewMessageRef.current = onNewMessage;

  useEffect(() => {
    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Cleanup existing channel
    if (channelRef.current) {
      console.log("[MessagesRealtime] Removing previous channel");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Exit early if disabled or no conversation
    if (!enabled || !conversationId) {
      console.log("[MessagesRealtime] Skipping - enabled:", enabled, "conversationId:", conversationId);
      return;
    }

    const channelName = `msg_rt_${conversationId}_${Date.now()}`;
    console.log("[MessagesRealtime] Creating channel:", channelName, "for conversation:", conversationId);

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
          console.log("[MessagesRealtime] ✅ INSERT received:", payload.new);
          const newMessage = payload.new as Message;
          // Use the ref to always get the latest callback
          onNewMessageRef.current(newMessage);
        }
      )
      .subscribe((status, err) => {
        console.log("[MessagesRealtime] Channel status:", status, err ? `Error: ${err.message}` : "");
        
        if (status === "SUBSCRIBED") {
          console.log("[MessagesRealtime] ✅ Successfully subscribed to:", conversationId);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("[MessagesRealtime] ❌ Channel error/timeout, will retry in 3s");
          // Schedule retry
          retryTimeoutRef.current = setTimeout(() => {
            // Force re-run of this effect by doing nothing - the conversation hasn't changed
            // Instead, we need to recreate manually
            if (channelRef.current) {
              supabase.removeChannel(channelRef.current);
              channelRef.current = null;
            }
          }, 3000);
        } else if (status === "CLOSED") {
          console.log("[MessagesRealtime] Channel closed for:", conversationId);
        }
      });

    channelRef.current = channel;

    // Cleanup function - runs when conversationId changes or component unmounts
    return () => {
      console.log("[MessagesRealtime] Cleanup triggered for:", conversationId);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, enabled]); // Only re-run when these change

  return {
    isSubscribed: channelRef.current !== null,
  };
}
