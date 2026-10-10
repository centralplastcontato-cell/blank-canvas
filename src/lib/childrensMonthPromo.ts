import { useEffect, useState } from "react";
import { whatsappLink } from "./whatsappLink";
import { supabase } from "@/integrations/supabase/client";

/**
 * Promoção "Mês das Crianças" do Castelo da Diversão (LP castelodadiversao.com.br/.online).
 *
 * Some sozinha depois do prazo (horário de Brasília), sem precisar publicar nada.
 * Para desligar ANTES do prazo (ex.: os 10 contratos já foram fechados), rode no Supabase:
 *   UPDATE public.lp_promotions SET enabled = false, updated_at = now()
 *   WHERE slug = 'castelo-mes-das-criancas-2026';
 */
export const CHILDRENS_MONTH_SLUG = "castelo-mes-das-criancas-2026";
// Brasil não tem horário de verão desde 2019: -03:00 fixo
export const CHILDRENS_MONTH_DEADLINE = new Date("2026-10-17T23:59:59-03:00");

export const CASTELO_WHATSAPP_PROMO_URL = whatsappLink("5515974034646", "Olá! Vim pelo site e quero saber da promoção Mês das Crianças");

export function isWithinPromoWindow(now: number = Date.now()): boolean {
  return now <= CHILDRENS_MONTH_DEADLINE.getTime();
}

export function msUntilDeadline(now: number = Date.now()): number {
  return Math.max(0, CHILDRENS_MONTH_DEADLINE.getTime() - now);
}

/**
 * true enquanto a promoção deve aparecer: dentro do prazo E ligada no banco.
 * Começa escondida até ler o interruptor (evita mostrar e sumir em seguida).
 * Se o banco não responder, vale só o prazo.
 */
export function useChildrensMonthPromo(): boolean {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [inWindow, setInWindow] = useState(() => isWithinPromoWindow());

  useEffect(() => {
    if (!isWithinPromoWindow()) {
      setEnabled(false);
      return;
    }
    let cancelled = false;
    (supabase as any)
      .from("lp_promotions")
      .select("enabled")
      .eq("slug", CHILDRENS_MONTH_SLUG)
      .maybeSingle()
      .then(({ data, error }: { data: { enabled: boolean } | null; error: unknown }) => {
        if (cancelled) return;
        if (error) setEnabled(true);
        else setEnabled(data ? data.enabled === true : true);
      }, () => { if (!cancelled) setEnabled(true); });
    return () => { cancelled = true; };
  }, []);

  // Some no minuto em que o prazo acaba, mesmo com a página aberta
  useEffect(() => {
    if (!inWindow) return;
    const t = setInterval(() => setInWindow(isWithinPromoWindow()), 30_000);
    return () => clearInterval(t);
  }, [inWindow]);

  return inWindow && enabled === true;
}

export function useCountdown(): { days: number; hours: number; minutes: number; seconds: number } {
  const [left, setLeft] = useState(() => msUntilDeadline());
  useEffect(() => {
    const t = setInterval(() => setLeft(msUntilDeadline()), 1000);
    return () => clearInterval(t);
  }, []);
  return {
    days: Math.floor(left / 86_400_000),
    hours: Math.floor((left / 3_600_000) % 24),
    minutes: Math.floor((left / 60_000) % 60),
    seconds: Math.floor((left / 1000) % 60),
  };
}
