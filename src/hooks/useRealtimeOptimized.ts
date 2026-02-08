import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type RealtimeCallback = () => void;

interface UseRealtimeOptimizedOptions {
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number;
  /** Channel name suffix for uniqueness */
  channelSuffix?: string;
}

/**
 * Optimized Realtime hook that consolidates subscriptions and debounces callbacks
 * to reduce database calls and Cloud usage
 */
export function useConversationsRealtime(
  instanceId: string | undefined,
  onConversationChange: RealtimeCallback,
  options: UseRealtimeOptimizedOptions = {}
) {
  const { debounceMs = 500, channelSuffix = "" } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubscribedRef = useRef(false);

  const debouncedCallback = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onConversationChange();
    }, debounceMs);
  }, [onConversationChange, debounceMs]);

  useEffect(() => {
    if (!instanceId || isSubscribedRef.current) return;
    isSubscribedRef.current = true;

    const channel = supabase
      .channel(`conversations-optimized-${instanceId}${channelSuffix}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wapi_conversations",
          filter: `instance_id=eq.${instanceId}`,
        },
        debouncedCallback
      )
      .subscribe();

    return () => {
      isSubscribedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [instanceId, debouncedCallback, channelSuffix]);
}

/**
 * Optimized Realtime hook for leads - consolidates INSERT/UPDATE/DELETE
 */
export function useLeadsRealtime(
  onInsert?: (payload: unknown) => void,
  onUpdate?: (payload: unknown) => void,
  onDelete?: (payload: unknown) => void,
  options: UseRealtimeOptimizedOptions = {}
) {
  const { debounceMs = 300 } = options;
  const insertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingInserts = useRef<unknown[]>([]);
  const pendingUpdates = useRef<unknown[]>([]);
  const pendingDeletes = useRef<unknown[]>([]);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (isSubscribedRef.current) return;
    isSubscribedRef.current = true;

    const channel = supabase
      .channel("leads-realtime-optimized")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "campaign_leads",
        },
        (payload) => {
          pendingInserts.current.push(payload.new);
          if (insertTimeoutRef.current) clearTimeout(insertTimeoutRef.current);
          insertTimeoutRef.current = setTimeout(() => {
            if (onInsert && pendingInserts.current.length > 0) {
              pendingInserts.current.forEach(p => onInsert(p));
              pendingInserts.current = [];
            }
          }, debounceMs);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaign_leads",
        },
        (payload) => {
          pendingUpdates.current.push(payload.new);
          if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = setTimeout(() => {
            if (onUpdate && pendingUpdates.current.length > 0) {
              pendingUpdates.current.forEach(p => onUpdate(p));
              pendingUpdates.current = [];
            }
          }, debounceMs);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "campaign_leads",
        },
        (payload) => {
          pendingDeletes.current.push(payload.old);
          if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
          deleteTimeoutRef.current = setTimeout(() => {
            if (onDelete && pendingDeletes.current.length > 0) {
              pendingDeletes.current.forEach(p => onDelete(p));
              pendingDeletes.current = [];
            }
          }, debounceMs);
        }
      )
      .subscribe();

    return () => {
      isSubscribedRef.current = false;
      [insertTimeoutRef, updateTimeoutRef, deleteTimeoutRef].forEach(ref => {
        if (ref.current) clearTimeout(ref.current);
      });
      supabase.removeChannel(channel);
    };
  }, [onInsert, onUpdate, onDelete, debounceMs]);
}

/**
 * Optimized hook for unread count - uses single channel with debounce
 */
export function useUnreadCountRealtime(
  onUnreadChange: RealtimeCallback,
  options: UseRealtimeOptimizedOptions = {}
) {
  const { debounceMs = 1000 } = options; // Higher debounce for unread count
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubscribedRef = useRef(false);

  const debouncedCallback = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onUnreadChange();
    }, debounceMs);
  }, [onUnreadChange, debounceMs]);

  useEffect(() => {
    if (isSubscribedRef.current) return;
    isSubscribedRef.current = true;

    const channel = supabase
      .channel("unread-count-optimized")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wapi_conversations",
        },
        (payload) => {
          // Only trigger if unread_count actually changed
          const oldCount = (payload.old as { unread_count?: number })?.unread_count;
          const newCount = (payload.new as { unread_count?: number })?.unread_count;
          if (oldCount !== newCount) {
            debouncedCallback();
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [debouncedCallback]);
}
