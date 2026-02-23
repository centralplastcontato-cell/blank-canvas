import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentCompanyId } from "@/lib/supabase-helpers";
import { ArrowRightLeft, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransferNotificationData {
  lead_id: string;
  lead_name: string;
  transferred_by: string;
}

interface TransferNotification {
  id: string;
  title: string;
  message: string | null;
  data: TransferNotificationData;
  created_at: string;
  read: boolean;
  type: string;
}

interface TransferAlertBannerProps {
  userId: string;
  onViewLead: (leadId: string) => void;
}

export function TransferAlertBanner({ userId, onViewLead }: TransferAlertBannerProps) {
  const [transfers, setTransfers] = useState<TransferNotification[]>([]);

  // Fetch unread transfer notifications
  useEffect(() => {
    const fetchTransfers = async () => {
      const companyId = getCurrentCompanyId();
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "lead_transfer")
        .eq("read", false)
        .order("created_at", { ascending: false });

      if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      }

      const { data } = await query;

      if (data) {
        // Filter and cast only valid transfer notifications
        const validTransfers = data
          .filter((n) => n.data && typeof n.data === 'object' && 'lead_id' in (n.data as object))
          .map((n) => ({
            ...n,
            data: n.data as unknown as TransferNotificationData,
          }));
        setTransfers(validTransfers);
      }
    };

    fetchTransfers();

    // Subscribe to new transfer notifications
    const channel = supabase
      .channel("transfer-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as TransferNotification & { company_id?: string };
          const currentCompanyId = getCurrentCompanyId();
          if (notification.company_id && currentCompanyId && notification.company_id !== currentCompanyId) {
            return;
          }
          if (notification.type === "lead_transfer") {
            setTransfers((prev) => [notification, ...prev]);
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
          const notification = payload.new as TransferNotification;
          if (notification.read) {
            setTransfers((prev) => prev.filter((t) => t.id !== notification.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleViewLead = async (notification: TransferNotification) => {
    // Mark as read
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification.id);

    // Remove from local state
    setTransfers((prev) => prev.filter((t) => t.id !== notification.id));

    // Open the lead details
    onViewLead(notification.data.lead_id);
  };

  const handleDismiss = async (notification: TransferNotification) => {
    // Mark as read (dismiss)
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification.id);

    // Remove from local state
    setTransfers((prev) => prev.filter((t) => t.id !== notification.id));
  };

  // Use transfers directly (already filtered by read status)
  const visibleTransfers = transfers;

  if (visibleTransfers.length === 0) {
    return null;
  }

  // Show only the most recent transfer
  const latestTransfer = visibleTransfers[0];
  const remainingCount = visibleTransfers.length - 1;

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/20 px-4 py-3 animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/20 shrink-0">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {latestTransfer.data.transferred_by} transferiu um lead para você
            </p>
            <p className="text-xs text-muted-foreground truncate">
              <span className="font-medium text-foreground">{latestTransfer.data.lead_name}</span>
              {remainingCount > 0 && (
                <span className="ml-1">
                  e mais {remainingCount} {remainingCount === 1 ? "transferência" : "transferências"}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="default"
            className="h-8 gap-1.5"
            onClick={() => handleViewLead(latestTransfer)}
          >
            Visualizar
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => handleDismiss(latestTransfer)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
