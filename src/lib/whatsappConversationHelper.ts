import { supabase } from "@/integrations/supabase/client";

interface ExistingConversation {
  conversationId: string;
  instanceId: string;
  companyId: string;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Generate phone variants for Brazilian numbers to handle 9th digit differences.
 * E.g. 11999887766 -> also try 5511999887766, 1199887766, 551199887766
 */
function getBrazilianPhoneVariants(phone: string): string[] {
  const clean = normalizePhone(phone);
  const variants = new Set<string>();
  variants.add(clean);

  // With country code 55
  if (!clean.startsWith("55") && clean.length >= 10) {
    variants.add("55" + clean);
  }

  // Without country code 55
  if (clean.startsWith("55") && clean.length >= 12) {
    variants.add(clean.slice(2));
  }

  // With 9th digit (mobile): add 9 after DDD
  const withoutCountry = clean.startsWith("55") ? clean.slice(2) : clean;
  if (withoutCountry.length === 10) {
    const withNine = withoutCountry.slice(0, 2) + "9" + withoutCountry.slice(2);
    variants.add(withNine);
    variants.add("55" + withNine);
  }

  // Without 9th digit
  if (withoutCountry.length === 11 && withoutCountry[2] === "9") {
    const withoutNine = withoutCountry.slice(0, 2) + withoutCountry.slice(3);
    variants.add(withoutNine);
    variants.add("55" + withoutNine);
  }

  return Array.from(variants);
}

/**
 * Find an existing WhatsApp conversation for a lead.
 * Priority: lead_id match > phone match (scoped by companyId).
 */
export async function findExistingConversation(
  leadId?: string | null,
  phone?: string | null,
  companyId?: string | null
): Promise<ExistingConversation | null> {
  // 1. Try by lead_id first (most reliable)
  if (leadId) {
    let query = supabase
      .from("wapi_conversations")
      .select("id, instance_id, company_id")
      .eq("lead_id", leadId);

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data } = await query
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      return {
        conversationId: data.id,
        instanceId: data.instance_id,
        companyId: data.company_id,
      };
    }
  }

  // 2. Fallback: try by phone variants (always scoped by companyId when available)
  if (phone) {
    const variants = getBrazilianPhoneVariants(phone);

    let query = supabase
      .from("wapi_conversations")
      .select("id, instance_id, company_id")
      .in("contact_phone", variants);

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data } = await query
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      return {
        conversationId: data.id,
        instanceId: data.instance_id,
        companyId: data.company_id,
      };
    }
  }

  return null;
}
