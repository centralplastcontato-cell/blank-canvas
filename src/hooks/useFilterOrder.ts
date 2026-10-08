import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_FILTER_ORDER = [
  'all', 'unread', 'ia_equipe', 'ia', 'closed', 'fechados', 'oe', 'visitas', 'freelancer', 'equipe', 'favorites', 'grupos'
];

export function useFilterOrder(userId: string | null) {
  const [filterOrder, setFilterOrder] = useState<string[]>(DEFAULT_FILTER_ORDER);
  const [isLoading, setIsLoading] = useState(true);

  // Load user preferences
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_filter_preferences')
          .select('filter_order')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading filter preferences:', error);
        }

        if (data?.filter_order) {
          // Filtros novos (ex.: IA) entram na ordem salva, logo depois de "Não lidas"
          const saved = data.filter_order as string[];
          const missing = DEFAULT_FILTER_ORDER.filter((f) => !saved.includes(f));
          const at = Math.max(0, saved.indexOf('unread') + 1);
          setFilterOrder(missing.length ? [...saved.slice(0, at), ...missing, ...saved.slice(at)] : saved);
        }
      } catch (err) {
        console.error('Error loading filter preferences:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [userId]);

  // Save preferences
  const saveFilterOrder = useCallback(async (newOrder: string[]) => {
    if (!userId) return;

    setFilterOrder(newOrder);

    try {
      const { error } = await supabase
        .from('user_filter_preferences')
        .upsert(
          { user_id: userId, filter_order: newOrder },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Error saving filter preferences:', error);
      }
    } catch (err) {
      console.error('Error saving filter preferences:', err);
    }
  }, [userId]);

  return {
    filterOrder,
    setFilterOrder: saveFilterOrder,
    isLoading,
    defaultOrder: DEFAULT_FILTER_ORDER
  };
}
