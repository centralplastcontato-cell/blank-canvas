import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentCompanyId } from "@/lib/supabase-helpers";
import { HelpCircle, X, MessageSquare, ChevronDown, ChevronUp, Phone, Calendar, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useNotificationSounds } from "@/hooks/useNotificationSounds";
import { useChatNotificationToggle } from "@/hooks/useChatNotificationToggle";
import { LEAD_STATUS_LABELS } from "@/types/crm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QuestionsNotificationData {
  conversation_id: string;
  contact_name: string;
  contact_phone: string;
  unit: string;
}

interface QuestionsNotification {
  id: string;
  title: string;
  message: string | null;
  data: QuestionsNotificationData;
  created_at: string;
  read: boolean;
  type: string;
}

interface LeadDetails {
  name: string;
  status: string;
  created_at: string;
  whatsapp: string;
}

interface QuestionsAlertBannerProps {
  userId: string;
  onOpenConversation: (conversationId: string, phone: string) => void;
}

export function QuestionsAlertBanner({ userId, onOpenConversation }: QuestionsAlertBannerProps) {
  const [alerts, setAlerts] = useState<QuestionsNotification[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const { playQuestionsSound } = useNotificationSounds();
  const { notificationsEnabled } = useChatNotificationToggle();
  const notificationsEnabledRef = useRef(notificationsEnabled);

  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  useEffect(() => {
    const fetchAlerts = async () => {
      const companyId = getCurrentCompanyId();
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "lead_questions")
        .eq("read", false)
        .order("created_at", { ascending: false });

      if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      }

      const { data } = await query;

      if (data) {
        const validAlerts = data
          .filter((n) => n.data && typeof n.data === 'object' && 'conversation_id' in (n.data as object))
          .map((n) => ({
            ...n,
            data: n.data as unknown as QuestionsNotificationData,
          }));
        setAlerts(validAlerts);
        if (validAlerts.length > 0 && notificationsEnabledRef.current) {
          playQuestionsSound();
        }
      }
    };

    fetchAlerts();

    const channel = supabase
      .channel("questions-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as QuestionsNotification & { company_id?: string };
          const currentCompanyId = getCurrentCompanyId();
          if (notification.company_id && currentCompanyId && notification.company_id !== currentCompanyId) {
            return;
          }
          if (notification.type === "lead_questions") {
            setAlerts((prev) => [notification, ...prev]);
            if (notificationsEnabledRef.current) {
              playQuestionsSound();
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as QuestionsNotification;
          if (notification.read) {
            setAlerts((prev) => prev.filter((a) => a.id !== notification.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchLeadDetails = useCallback(async (conversationId: string) => {
    if (leadDetails || loadingDetails) return;
    setLoadingDetails(true);

    try {
      // Get conversation -> lead_id
      const { data: conv } = await supabase
        .from("wapi_conversations")
        .select("lead_id")
        .eq("id", conversationId)
        .single();

      if (conv?.lead_id) {
        // Get lead details
        const { data: lead } = await supabase
          .from("campaign_leads")
          .select("name, status, created_at, whatsapp")
          .eq("id", conv.lead_id)
          .single();

        if (lead) {
          setLeadDetails(lead as LeadDetails);
        }
      }

      // Get last message from lead
      const { data: msg } = await supabase
        .from("wapi_messages")
        .select("content")
        .eq("conversation_id", conversationId)
        .eq("from_me", false)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      if (msg?.content) {
        setLastMessage(msg.content);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingDetails(false);
    }
  }, [leadDetails, loadingDetails]);

  const handleToggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && alerts.length > 0) {
      fetchLeadDetails(alerts[0].data.conversation_id);
    }
  };

  const handleOpenConversation = async (notification: QuestionsNotification) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification.id);

    setAlerts((prev) => prev.filter((a) => a.id !== notification.id));
    setExpanded(false);
    setLeadDetails(null);
    setLastMessage(null);
    onOpenConversation(notification.data.conversation_id, notification.data.contact_phone);
  };

  const handleDismiss = async (notification: QuestionsNotification) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification.id);

    setAlerts((prev) => prev.filter((a) => a.id !== notification.id));
    setExpanded(false);
    setLeadDetails(null);
    setLastMessage(null);
  };

  if (alerts.length === 0) {
    return null;
  }

  const latestAlert = alerts[0];
  const remainingCount = alerts.length - 1;
  const statusLabel = leadDetails ? (LEAD_STATUS_LABELS as Record<string, string>)[leadDetails.status] || leadDetails.status : null;

  return (
    <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 border-b-2 border-emerald-400 animate-in slide-in-from-top duration-300 shadow-lg shadow-emerald-500/40">
      {/* Compact header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div
          className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
          onClick={handleToggleExpand}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 shrink-0">
            <HelpCircle className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">
              💬❓ <span className="font-extrabold">{latestAlert.data.contact_name || latestAlert.data.contact_phone}</span>
              {remainingCount > 0 && (
                <span className="ml-1 font-medium text-emerald-100 text-xs">
                  +{remainingCount}
                </span>
              )}
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-white/70 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/70 shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="icon"
            className="h-8 w-8 bg-white text-emerald-700 hover:bg-emerald-50 shadow"
            onClick={() => handleOpenConversation(latestAlert)}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => handleDismiss(latestAlert)}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Expandable details panel */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-emerald-400/40 animate-in slide-in-from-top-2 duration-200">
          {loadingDetails ? (
            <div className="flex items-center gap-2 py-2">
              <div className="w-3 h-3 rounded-full bg-white/30 animate-pulse" />
              <span className="text-xs text-emerald-100">Carregando...</span>
            </div>
          ) : (
            <div className="space-y-2 mt-1">
              {/* Lead info */}
              {leadDetails && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-100">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {leadDetails.whatsapp}
                  </span>
                  {statusLabel && (
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {statusLabel}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(leadDetails.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}

              {/* Last message */}
              {lastMessage && (
                <div className="bg-white/10 rounded-md px-3 py-2 text-xs text-white/90 line-clamp-2">
                  "{lastMessage}"
                </div>
              )}

              {!leadDetails && !lastMessage && (
                <p className="text-xs text-emerald-100/70">Sem dados adicionais do lead.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
