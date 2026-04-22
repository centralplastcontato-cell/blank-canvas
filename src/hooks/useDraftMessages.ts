import { useCallback } from "react";

const DRAFT_PREFIX = "chat-draft:";

export function useDraftMessages() {
  const getDraft = useCallback((conversationId: string): string => {
    try {
      return sessionStorage.getItem(`${DRAFT_PREFIX}${conversationId}`) || "";
    } catch {
      return "";
    }
  }, []);

  const saveDraft = useCallback((conversationId: string, text: string) => {
    try {
      if (text.trim()) {
        sessionStorage.setItem(`${DRAFT_PREFIX}${conversationId}`, text);
      } else {
        sessionStorage.removeItem(`${DRAFT_PREFIX}${conversationId}`);
      }
    } catch {
      // sessionStorage full or unavailable
    }
  }, []);

  const clearDraft = useCallback((conversationId: string) => {
    try {
      sessionStorage.removeItem(`${DRAFT_PREFIX}${conversationId}`);
    } catch {
      // ignore
    }
  }, []);

  return { getDraft, saveDraft, clearDraft };
}
