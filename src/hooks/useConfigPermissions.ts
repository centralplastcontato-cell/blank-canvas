import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ConfigPermissions {
  connection: boolean;
  messages: boolean;
  notifications: boolean;
  automations: boolean;
  advanced: boolean;
}

export function useConfigPermissions(userId: string | undefined, isAdmin: boolean) {
  const [permissions, setPermissions] = useState<ConfigPermissions>({
    connection: false,
    messages: false,
    notifications: false,
    automations: false,
    advanced: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    // Admins have all permissions
    if (isAdmin) {
      setPermissions({
        connection: true,
        messages: true,
        notifications: true,
        automations: true,
        advanced: true,
      });
      setIsLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      const { data } = await supabase
        .from("user_permissions")
        .select("permission, granted")
        .eq("user_id", userId)
        .in("permission", [
          "config.whatsapp.connection",
          "config.whatsapp.messages",
          "config.whatsapp.notifications",
          "config.whatsapp.automations",
          "config.whatsapp.advanced",
        ]);

      if (data) {
        const perms: ConfigPermissions = {
          connection: false,
          messages: false,
          notifications: false,
          automations: false,
          advanced: false,
        };

        data.forEach((p) => {
          if (p.granted) {
            switch (p.permission) {
              case "config.whatsapp.connection":
                perms.connection = true;
                break;
              case "config.whatsapp.messages":
                perms.messages = true;
                break;
              case "config.whatsapp.notifications":
                perms.notifications = true;
                break;
              case "config.whatsapp.automations":
                perms.automations = true;
                break;
              case "config.whatsapp.advanced":
                perms.advanced = true;
                break;
            }
          }
        });

        setPermissions(perms);
      }

      setIsLoading(false);
    };

    fetchPermissions();
  }, [userId, isAdmin]);

  const hasAnyPermission = Object.values(permissions).some(Boolean);

  return { permissions, isLoading, hasAnyPermission };
}
