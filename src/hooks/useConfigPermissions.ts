import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ConfigPermissions {
  connection: boolean;
  messages: boolean;
  notifications: boolean;
  automations: boolean;
  advanced: boolean;
}

/** isOwner: dono da empresa tem tudo liberado, a não ser o que foi negado de propósito */
export function useConfigPermissions(userId: string | undefined, isAdmin: boolean, isOwner = false) {
  // Linhas de permissão do usuário (buscadas uma vez). O que vale para o dono é
  // decidido na hora de mostrar: antes, a busca feita antes de saber que era o
  // dono podia terminar depois e apagar as permissões dele (sumiam Conexão,
  // Conteúdo, Notificações e Automações).
  const [rows, setRows] = useState<Array<{ permission: string; granted: boolean }> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId || isAdmin) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    supabase
      .from("user_permissions")
      .select("permission, granted")
      .eq("user_id", userId)
      .in("permission", [
        "config.whatsapp.connection",
        "config.whatsapp.messages",
        "config.whatsapp.notifications",
        "config.whatsapp.automations",
        "config.whatsapp.advanced",
      ])
      .then(({ data }) => {
        if (cancelled) return;
        setRows((data || []) as Array<{ permission: string; granted: boolean }>);
        setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId, isAdmin]);

  const permissions = useMemo<ConfigPermissions>(() => {
    // Admins have all permissions
    if (isAdmin) return { connection: true, messages: true, notifications: true, automations: true, advanced: true };
    const perms: ConfigPermissions = {
      connection: isOwner, messages: isOwner, notifications: isOwner, automations: isOwner, advanced: isOwner,
    };
    for (const p of rows || []) {
      const key = p.permission.replace("config.whatsapp.", "") as keyof ConfigPermissions;
      if (key in perms) perms[key] = !!p.granted;
    }
    return perms;
  }, [rows, isAdmin, isOwner]);

  const hasAnyPermission = Object.values(permissions).some(Boolean);

  return { permissions, isLoading, hasAnyPermission };
}
