import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface InstancePermissions {
  canViewAllInstances: boolean;
  allowedInstanceIds: string[]; // wapi_instances.id list (empty when canViewAll)
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Per-user WhatsApp instance restriction.
 *
 * Storage: `user_permissions` table.
 *   - `whatsapp.instance.all`           → boolean (default: true when missing)
 *   - `whatsapp.instance.<instance_id>` → boolean (per-instance allow-list)
 *
 * When `canViewAllInstances` is true the caller should ignore `allowedInstanceIds`
 * and show every instance the user can see via unit permissions.
 */
export function useInstancePermissions(userId?: string | undefined): InstancePermissions {
  const [canViewAllInstances, setCanViewAllInstances] = useState(true);
  const [allowedInstanceIds, setAllowedInstanceIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    let uid = userId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      uid = user?.id;
    }
    if (!uid) {
      setCanViewAllInstances(true);
      setAllowedInstanceIds([]);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_permissions")
      .select("permission, granted")
      .eq("user_id", uid)
      .like("permission", "whatsapp.instance.%");

    if (error) {
      console.error("[useInstancePermissions] error:", error);
      setCanViewAllInstances(true);
      setAllowedInstanceIds([]);
      setIsLoading(false);
      return;
    }

    const map = new Map<string, boolean>();
    (data || []).forEach((p) => map.set(p.permission, p.granted));

    const all = map.get("whatsapp.instance.all") ?? true; // default: vê tudo
    const ids: string[] = [];
    if (!all) {
      map.forEach((granted, key) => {
        if (granted && key !== "whatsapp.instance.all") {
          ids.push(key.replace("whatsapp.instance.", ""));
        }
      });
    }

    setCanViewAllInstances(all);
    setAllowedInstanceIds(ids);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    canViewAllInstances,
    allowedInstanceIds,
    isLoading,
    refetch: fetch,
  };
}
