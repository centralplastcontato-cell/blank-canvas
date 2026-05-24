import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface QueueItem {
  id: string;
  company_id: string;
  instance_id: string;
  to_phone: string;
  contact_name: string | null;
  preview: string | null;
  source: string;
  status: "pending" | "approved" | "sent" | "rejected" | "failed";
  scheduled_for: string | null;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

const AUTO_APPROVE_MINUTES_DEFAULT = 30;

export function useOutboundQueue() {
  const { currentCompany } = useCompany();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentCompany?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("whatsapp_outbound_queue")
      .select("*")
      .eq("company_id", currentCompany.id)
      .in("status", ["pending", "approved", "failed"])
      .order("created_at", { ascending: false })
      .limit(500);
    setItems((data ?? []) as QueueItem[]);
    setLoading(false);
  }, [currentCompany?.id]);

  useEffect(() => {
    load();
    if (!currentCompany?.id) return;
    const channel = supabase
      .channel(`outbound_queue_${currentCompany.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_outbound_queue",
          filter: `company_id=eq.${currentCompany.id}`,
        },
        () => load(),
      )
      .subscribe();
    const interval = setInterval(load, 30_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [currentCompany?.id, load]);

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const approvedCount = items.filter((i) => i.status === "approved").length;
  const failedCount = items.filter((i) => i.status === "failed").length;
  const totalActionable = pendingCount + approvedCount + failedCount;

  const approve = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    const { data: { user } } = await supabase.auth.getUser();
    const nowIso = new Date().toISOString();
    await supabase
      .from("whatsapp_outbound_queue")
      .update({
        status: "approved",
        approved_at: nowIso,
        approved_by: user?.id ?? null,
        scheduled_for: nowIso,
      })
      .in("id", ids);
    await load();
  }, [load]);

  const reject = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("whatsapp_outbound_queue")
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
        rejected_by: user?.id ?? null,
      })
      .in("id", ids);
    await load();
  }, [load]);

  const minutesUntilAutoApprove = (createdAt: string): number => {
    const elapsed = (Date.now() - new Date(createdAt).getTime()) / 60_000;
    return Math.max(0, Math.ceil(AUTO_APPROVE_MINUTES_DEFAULT - elapsed));
  };

  return {
    items,
    loading,
    pendingCount,
    approvedCount,
    failedCount,
    totalActionable,
    approve,
    reject,
    reload: load,
    minutesUntilAutoApprove,
  };
}
