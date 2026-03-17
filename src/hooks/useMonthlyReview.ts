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
  metrics: MonthlyMetrics;
  previous_metrics: MonthlyMetrics | null;
  ai_summary: string | null;
  ai_context_generated: string | null;
  dismissed_by: string[];
  created_at: string;
}

export function useMonthlyReview() {
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

      // Get the most recent review for this company
      const { data, error } = await supabase
        .from("monthly_reviews")
        .select("*")
        .eq("company_id", companyId)
        .order("review_month", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[useMonthlyReview] Error:", error);
        setIsLoading(false);
        return;
      }

      if (data) {
        const reviewData = data as unknown as MonthlyReview;
        setReview(reviewData);
        // Check if current user already dismissed
        const dismissedList = reviewData.dismissed_by || [];
        setIsDismissed(dismissedList.includes(userId));
      }

      setIsLoading(false);
    };

    fetchReview();
  }, [companyId, userId]);

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
      const { data } = await supabase
        .from("monthly_reviews")
        .select("*")
        .eq("company_id", companyId)
        .order("review_month", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const reviewData = data as unknown as MonthlyReview;
        setReview(reviewData);
        setIsDismissed(false);
      }
    } catch (err) {
      console.error("[useMonthlyReview] Generate error:", err);
      throw err;
    }
  }, [companyId]);

  return {
    review,
    isLoading,
    isDismissed,
    dismiss,
    generateNow,
    showBanner: !!review && !isDismissed && !isLoading,
  };
}
