import { useEffect, useRef, useState, useCallback } from "react";
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
  metadata?: Record<string, string> | null;
}

interface UseMessagesRealtimeOptions {
  conversationId: string | null;
  onNewMessage: (message: Message) => void;
  onMessageUpdate?: (message: Message) => void;
  enabled?: boolean;
}

const POLL_MIN_MS = 5_000;
const POLL_MAX_MS = 15_000;
const RECONNECT_DELAY_MS = 3_000;

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
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const lastTimestampRef = useRef<string | null>(null);
  const pollIntervalRef = useRef(POLL_MIN_MS);
  const [reconnectCounter, setReconnectCounter] = useState(0);

  onNewMessageRef.current = onNewMessage;
  onMessageUpdateRef.current = onMessageUpdate;

  // ── Polling fallback ──────────────────────────────────────────────
  const pollMessages = useCallback(async () => {
    if (!conversationId || !enabled) return;

    const since = lastTimestampRef.current;
    if (!since) {
      // No baseline yet — wait for realtime or next cycle
      pollTimeoutRef.current = setTimeout(pollMessages, pollIntervalRef.current);
      return;
    }

    try {
      const { data } = await supabase
        .from("wapi_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .gt("timestamp", since)
        .order("timestamp", { ascending: true })
        .limit(50);

      if (data && data.length > 0) {
        let hasNew = false;
        for (const msg of data) {
          if (!seenIdsRef.current.has(msg.id)) {
            seenIdsRef.current.add(msg.id);
            hasNew = true;
            onNewMessageRef.current(msg as Message);
          }
        }
        // Update baseline to latest polled message
        lastTimestampRef.current = data[data.length - 1].timestamp;
        // Reset backoff if new messages found
        if (hasNew) pollIntervalRef.current = POLL_MIN_MS;
      } else {
        // Backoff when idle
        pollIntervalRef.current = Math.min(pollIntervalRef.current + 2_000, POLL_MAX_MS);
      }
    } catch {
      // Silent fail — polling is a safety net
    }

    pollTimeoutRef.current = setTimeout(pollMessages, pollIntervalRef.current);
  }, [conversationId, enabled]);

  // ── Realtime subscription ─────────────────────────────────────────
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

    // Reset seen IDs on conversation change
    seenIdsRef.current.clear();
    pollIntervalRef.current = POLL_MIN_MS;

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
          // Track for deduplication with polling
          seenIdsRef.current.add(newMessage.id);
          // Update baseline timestamp
          if (!lastTimestampRef.current || newMessage.timestamp > lastTimestampRef.current) {
            lastTimestampRef.current = newMessage.timestamp;
          }
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
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[useMessagesRealtime] Channel ${status}, reconnecting in ${RECONNECT_DELAY_MS}ms...`);
          retryTimeoutRef.current = setTimeout(() => {
            if (channelRef.current) {
              supabase.removeChannel(channelRef.current);
              channelRef.current = null;
            }
            setReconnectCounter((c) => c + 1);
          }, RECONNECT_DELAY_MS);
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
  }, [conversationId, enabled, reconnectCounter]);

  // ── Start/stop polling alongside subscription ─────────────────────
  useEffect(() => {
    if (!enabled || !conversationId) return;

    // Initialize baseline timestamp to "now" so polling only catches future messages
    if (!lastTimestampRef.current) {
      lastTimestampRef.current = new Date().toISOString();
    }

    // Start polling after initial delay
    pollTimeoutRef.current = setTimeout(pollMessages, pollIntervalRef.current);

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [conversationId, enabled, pollMessages]);

  return { isSubscribed: channelRef.current !== null };
}
