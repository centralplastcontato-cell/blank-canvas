import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "./useCurrentCompanyId";

export interface MonthlyMetrics {
  total_leads: number;
  closed_leads: number;
  lost_leads: number;
  visit_leads: number;
  conversion_rate: number;
  total_events: number;
  total_revenue: number;
  avg_ticket: number;
  total_conversations: number;
  leads_by_unit: Record<string, number>;
}

export interface MonthlyReview {
  id: string;
  company_id: string;
  review_month: string;
  unit_slug: string | null;
  metrics: MonthlyMetrics;
  previous_metrics: MonthlyMetrics | null;
  ai_summary: string | null;
  ai_context_generated: string | null;
  dismissed_by: string[];
  created_at: string;
}

export function useMonthlyReview(unitSlug?: string) {
  const companyId = useCurrentCompanyId();
  const [review, setReview] = useState<MonthlyReview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!companyId || !userId) {
      setIsLoading(false);
      return;
    }

    const fetchReview = async () => {
      setIsLoading(true);

      // Build query filtered by unit
      let query = supabase
        .from("monthly_reviews")
        .select("*")
        .eq("company_id", companyId)
        .order("review_month", { ascending: false })
        .limit(1);

      if (unitSlug && unitSlug !== "all") {
        query = query.eq("unit_slug", unitSlug);
      } else {
        // Try to get unit-specific first, fallback to consolidated (null)
        // For "all" or no unit, get consolidated review
        query = query.is("unit_slug", null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error("[useMonthlyReview] Error:", error);
        setIsLoading(false);
        return;
      }

      if (data) {
        const reviewData = data as unknown as MonthlyReview;
        setReview(reviewData);
        const dismissedList = reviewData.dismissed_by || [];
        setIsDismissed(dismissedList.includes(userId));
      } else {
        setReview(null);
        setIsDismissed(false);
      }

      setIsLoading(false);
    };

    fetchReview();
  }, [companyId, userId, unitSlug]);

  const dismiss = useCallback(async () => {
    if (!review || !userId) return;

    const updatedDismissed = [...(review.dismissed_by || []), userId];

    await supabase
      .from("monthly_reviews")
      .update({ dismissed_by: updatedDismissed } as any)
      .eq("id", review.id);

    setIsDismissed(true);
  }, [review, userId]);

  const generateNow = useCallback(async () => {
    if (!companyId) return;

    try {
      const { error } = await supabase.functions.invoke("monthly-review", {
        body: { company_id: companyId },
      });

      if (error) throw error;

      // Refetch
      let query = supabase
        .from("monthly_reviews")
        .select("*")
        .eq("company_id", companyId)
        .order("review_month", { ascending: false })
        .limit(1);

      if (unitSlug && unitSlug !== "all") {
        query = query.eq("unit_slug", unitSlug);
      } else {
        query = query.is("unit_slug", null);
      }

      const { data } = await query.maybeSingle();

      if (data) {
        const reviewData = data as unknown as MonthlyReview;
        setReview(reviewData);
        setIsDismissed(false);
      }
    } catch (err) {
      console.error("[useMonthlyReview] Generate error:", err);
      throw err;
    }
  }, [companyId, unitSlug]);

  return {
    review,
    isLoading,
    isDismissed,
    dismiss,
    generateNow,
    showBanner: !!review && !isDismissed && !isLoading,
  };
}
