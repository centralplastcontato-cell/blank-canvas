// Salvar festa: a mesma regra em todo lugar que cria ou edita festa
// (Agenda, Central de Atendimento, ficha do lead e o card do lead no chat).
// Antes, fora da Agenda a festa saía sem criança, pais, opcionais e sem parcelas.
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { EventFormData } from "@/components/agenda/EventFormDialog";
import { packageValueFromTotal, samePaymentPlan } from "@/lib/eventPaymentPlan";
import { pendingPlanParcelas, isAdjustmentRow } from "@/lib/parcelasSync";

/** O que aconteceu com as parcelas ao salvar a festa */
export type PaymentSyncResult = "ok" | "unchanged" | "partial_receipts" | "check_failed";

export interface PaymentSyncOptions {
  /** na edição: o plano de pagamento mudou? (se não mudou, as parcelas ficam como estão) */
  planChanged?: boolean;
  /** taxas de cartão já carregadas (senão busca no banco) */
  cardFees?: any[];
  onFreshFees?: (fees: any[]) => void;
}

/** Festa como vem do banco (o que a tela de festa precisa) */
export interface EventRow {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: string | null;
  guest_count: number | null;
  unit: string | null;
  status: string;
  package_name: string | null;
  total_value: number | null;
  notes: string | null;
  lead_id?: string | null;
  data_fechamento_venda?: string | null;
  vendedor_responsavel_id?: string | null;
  payment_method?: string | null;
  payment_details?: any;
  child_name?: string | null;
  child_age?: string | null;
  child_birthdate?: string | null;
  parent_names?: string | null;
  gifts?: string | null;
  extra_guest_value?: number | null;
  extra_guest_value_antecipado?: number | null;
  extra_guest_value_no_dia?: number | null;
  is_permuta?: boolean | null;
  internal_notes?: string | null;
  birthday_children?: unknown;
  event_optionals?: unknown;
}

export const normalizeTimeValue = (value?: string | null) => {
  if (!value) return "";
  return value.slice(0, 5);
};

export const eventRowToFormData = (ev: EventRow): EventFormData => ({
  id: ev.id,
  title: ev.title,
  event_date: ev.event_date,
  start_time: normalizeTimeValue(ev.start_time),
  end_time: normalizeTimeValue(ev.end_time),
  event_type: ev.event_type || "aniversario",
  guest_count: ev.guest_count,
  unit: ev.unit || "",
  status: ev.status,
  package_name: ev.package_name || "",
  total_value: (() => {
    const optionals = Array.isArray(ev.event_optionals) ? ev.event_optionals : [];
    const pd = (ev.payment_details || {}) as any;
    return packageValueFromTotal({
      total: ev.total_value,
      optionalsTotal: optionals.reduce((sum: number, o: any) => sum + (o.value || 0), 0),
      discountType: pd.discount_type,
      discountValue: pd.discount_value,
      discountBase: pd.discount_base,
    });
  })(),
  notes: ev.notes || "",
  lead_id: ev.lead_id || null,
  data_fechamento_venda: ev.data_fechamento_venda || null,
  vendedor_responsavel_id: ev.vendedor_responsavel_id || null,
  payment_method: ev.payment_method || null,
  payment_details: ev.payment_details || null,
  child_name: ev.child_name || null,
  child_age: ev.child_age || null,
  child_birthdate: ev.child_birthdate || null,
  parent_names: ev.parent_names || null,
  gifts: ev.gifts || null,
  extra_guest_value: ev.extra_guest_value ?? null,
  extra_guest_value_antecipado: (ev as any).extra_guest_value_antecipado ?? null,
  extra_guest_value_no_dia: (ev as any).extra_guest_value_no_dia ?? null,
  is_permuta: ev.is_permuta || false,
  internal_notes: ev.internal_notes || "",
  birthday_children: (Array.isArray(ev.birthday_children) ? ev.birthday_children : []) as EventFormData["birthday_children"],
  event_optionals: (Array.isArray(ev.event_optionals) ? ev.event_optionals : []) as EventFormData["event_optionals"],
});

/** Campos gravados na festa (iguais aos da Agenda) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mesmo formato livre que a Agenda usava
export function buildEventPayload(data: EventFormData, companyId: string): any {
  const payload: Record<string, unknown> = {
    company_id: companyId,
    title: data.title,
    event_date: data.event_date,
    start_time: data.start_time || null,
    end_time: data.end_time || null,
    event_type: data.event_type || null,
    guest_count: data.guest_count,
    unit: data.unit || null,
    status: data.status,
    package_name: data.package_name || null,
    total_value: data.total_value,
    notes: data.notes || null,
    lead_id: data.lead_id || null,
    data_fechamento_venda: data.data_fechamento_venda || null,
    vendedor_responsavel_id: data.vendedor_responsavel_id || null,
    payment_method: data.payment_method || null,
    child_name: data.birthday_children?.[0]?.name || data.child_name || null,
    child_age: data.birthday_children?.[0]?.age || data.child_age || null,
    child_birthdate: data.birthday_children?.[0]?.birthdate || data.child_birthdate || null,
    birthday_children: (data.birthday_children || []).filter((c: any) => c.name || c.age || c.birthdate),
    parent_names: data.parent_names || null,
    gifts: data.gifts || null,
    extra_guest_value: data.extra_guest_value,
    extra_guest_value_antecipado: data.extra_guest_value_antecipado,
    extra_guest_value_no_dia: data.extra_guest_value_no_dia,
    is_permuta: data.is_permuta || false,
    internal_notes: data.internal_notes || null,
    event_optionals: (data.event_optionals || []).filter((o: any) => o.name || (o.value != null && o.value > 0)),
  } as any;
  if (data.payment_details) {
    payload.payment_details = data.payment_details;
    // Etapa 3: persistir blocos extras de pagamento na coluna dedicada
    payload.payment_blocks = Array.isArray((data.payment_details as any).payment_blocks)
      ? (data.payment_details as any).payment_blocks
      : null;
  }
  return payload;
}

/**
 * Refaz as parcelas a partir do plano de pagamento. Nunca apaga parcela com
 * recebimento parcial lançado (o recebimento sumiria junto). Na edição, se o
 * plano não mudou, as parcelas ficam como estão.
 */
export async function syncEventPayments(
  eventId: string,
  companyId: string,
  pd: any,
  opts: PaymentSyncOptions = {},
): Promise<PaymentSyncResult> {
  const planChanged = opts.planChanged ?? true;
  if (!pd) return "ok";
  try {
    // Check if there are already manually-managed payments (paid ones should not be wiped)
    const { data: existing, error: existingErr } = await supabase
      .from("event_payments")
      .select("id, status, amount, gross_amount, type, payment_method, notes")
      .eq("event_id", eventId);
    if (existingErr) return "check_failed";
    if (!planChanged && (existing || []).length > 0) return "unchanged";

    // Parcela em aberto com recebimento parcial: não refaz nada
    const unpaidIds = (existing || []).filter((p: any) => p.status !== "paid").map((p: any) => p.id);
    if (unpaidIds.length > 0) {
      const { data: entries, error: entriesErr } = await (supabase as any)
        .from("event_payment_entries")
        .select("payment_id")
        .in("payment_id", unpaidIds)
        .limit(1);
      if (entriesErr) return "check_failed";
      if (entries && entries.length > 0) return "partial_receipts";
    }
    const paidPayments = (existing || []).filter((p: any) => p.status === "paid");
    const hasPaidPayments = paidPayments.length > 0;

    // Calculate total gross already paid (use gross_amount if available, fallback to amount)
    const paidGrossTotal = paidPayments.reduce((sum: number, p: any) => {
      return sum + (Number(p.gross_amount) || Number(p.amount) || 0);
    }, 0);

    if (hasPaidPayments) {
      // Only delete pending payments, keep paid ones intact.
      // A parcela de ajuste ("Adicional - Ajuste pós-contrato") também é preservada:
      // o EventFormDialog a reconcilia (atualiza/remove) após o save — recriá-la aqui
      // resetava o vencimento para "hoje" e gerava spam na timeline a cada salvar.
      const pendingIds = (existing || [])
        .filter((p: any) => p.status !== "paid" && !isAdjustmentRow(p))
        .map((p: any) => p.id);
      if (pendingIds.length > 0) {
        await supabase.from("event_payments").delete().in("id", pendingIds);
      }
    } else {
      // Delete all existing payments to re-sync
      await supabase.from("event_payments").delete().eq("event_id", eventId);
    }

    // Helpers — resolve operator (snapshot first, then global default).
    // Do not depend only on React state here: this sync can run right after opening
    // the agenda, before agendaCardFees has finished loading.
    let effectiveCardFees = opts.cardFees || [];
    if (effectiveCardFees.length === 0) {
      const { data: freshFees } = await supabase
        .from("company_card_fees" as any)
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true);
      effectiveCardFees = (freshFees || []) as any[];
      if (effectiveCardFees.length > 0) opts.onFreshFees?.(effectiveCardFees);
    }
    const getCardOperator = (): any | null => {
      const opId = pd.card_operator_id;
      if (opId) {
        const found = effectiveCardFees.find((f: any) => f.id === opId);
        if (found) return found;
      }
      return effectiveCardFees[0] || null;
    };
    const getCardFeeRate = (forma: string, parcelas: number): number => {
      const op: any = getCardOperator();
      if (!op) return 0;
      if (forma === "cartao_debito") return Number(op.taxa_debito || 0);
      if (forma === "cartao" || forma === "cartao_credito") {
        const p = Math.min(Math.max(1, parcelas), 12);
        return Number(op[`taxa_credito_${p}x`] || 0);
      }
      return 0;
    };

    const applyFee = (amount: number, rate: number): number => {
      if (rate <= 0) return amount;
      return Math.round((amount * (1 - rate / 100)) * 100) / 100;
    };

    // Calculate total gross value of new rows before subtracting paid amounts
    let totalNewGross = 0;
    if (pd.entrada_valor && pd.entrada_valor > 0) totalNewGross += pd.entrada_valor;
    if (pd.parcelas_details && pd.parcelas_details.length > 0) {
      totalNewGross += pd.parcelas_details.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0);
    } else if (pd.saldo_valor && pd.saldo_valor > 0) {
      totalNewGross += pd.saldo_valor;
    }

    // If everything is already paid, skip creating new rows
    const remainingGross = totalNewGross - paidGrossTotal;
    if (hasPaidPayments && remainingGross <= 0) {
      // All paid, nothing to create
      return "ok";
    }

    const rows: any[] = [];

    // Entrada
    if (pd.entrada_valor && pd.entrada_valor > 0) {
      // Check if entrada was already paid (by type match)
      const entradaAlreadyPaid = paidPayments.some((p: any) => p.type === "entrada");
      if (!entradaAlreadyPaid) {
        const feeRate = getCardFeeRate(pd.entrada_forma || "", Number(pd.entrada_parcelas) || 1);
        const entradaRow: any = {
          event_id: eventId,
          company_id: companyId,
          type: "entrada",
          amount: applyFee(pd.entrada_valor, feeRate),
          due_date: pd.entrada_data || format(new Date(), "yyyy-MM-dd"),
          payment_method: pd.entrada_forma || null,
          status: "pending",
        };
        if (feeRate > 0) {
          entradaRow.gross_amount = pd.entrada_valor;
          entradaRow.card_fee_percent = feeRate;
        }
        rows.push(entradaRow);
      }
    }

    // Parcelas — for non-antecipado card, split into N monthly net rows; otherwise consolidate
    const saldoForma = pd.saldo_forma || "";
    const saldoIsCard = saldoForma === "cartao" || saldoForma === "cartao_credito" || saldoForma === "cartao_debito";
    const saldoIsDebit = saldoForma === "cartao_debito";
    const saldoParcelas = saldoIsDebit ? 1 : Math.max(1, Number(pd.parcelas) || 1);
    const saldoFeeRate = getCardFeeRate(saldoForma, saldoParcelas);

    // Guard: only block when there is a non-opcional saldo parcela already paid.
    // Opcionais (notes contains "[extra:" or starts with "Opcional") must NOT block saldo creation.
    const isOpcionalParcel = (p: any) => {
      const n = String(p?.notes || "");
      return n.startsWith("[extra:") || n.toLowerCase().includes("opcional");
    };
    const parcelaAlreadyPaid = paidPayments.some(
      (p: any) => p.type === "parcela" && !isOpcionalParcel(p),
    );

    if (!parcelaAlreadyPaid) {
      // Compute total saldo gross (sum of parcelas_details if present, else saldo_valor)
      let totalSaldoGross = 0;
      if (pd.parcelas_details && pd.parcelas_details.length > 0) {
        totalSaldoGross = pd.parcelas_details.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0);
      } else if (pd.saldo_valor && pd.saldo_valor > 0) {
        totalSaldoGross = pd.saldo_valor;
      }

      const operator: any = getCardOperator();
      const isNonAntecipado = saldoIsCard && !saldoIsDebit && operator && operator.antecipado === false && saldoParcelas > 1 && saldoFeeRate > 0;

      if (saldoIsCard && saldoFeeRate > 0 && isNonAntecipado && totalSaldoGross > 0) {
        // CASE A: card non-antecipado → split into N monthly net rows
        const { splitNonAntecipadoInstallments } = await import("@/lib/cardFees");
        const saleDate = pd.saldo_data || format(new Date(), "yyyy-MM-dd");
        const prazoDias = Number(operator.prazo_recebimento_dias) || 30;
        const slices = splitNonAntecipadoInstallments(totalSaldoGross, saldoFeeRate, saldoParcelas, saleDate, prazoDias);
        if (slices && slices.length > 0) {
          const grossPerSlice = Math.round((totalSaldoGross / saldoParcelas) * 100) / 100;
          for (const slice of slices) {
            rows.push({
              event_id: eventId,
              company_id: companyId,
              type: "parcela",
              amount: slice.amount,
              gross_amount: grossPerSlice,
              card_fee_percent: saldoFeeRate,
              card_installments: saldoParcelas,
              card_operator_id: operator.id,
              due_date: slice.due_date,
              payment_method: saldoForma,
              status: "pending",
              notes: `Parcela ${slice.index}/${slice.total} — Cartão ${saldoParcelas}x ${operator.operator_name || ""} (sem antecipação)`,
            });
          }
        }
      } else if (saldoIsCard && saldoFeeRate > 0 && totalSaldoGross > 0) {
        // CASE B: card antecipado / debit → consolidate into single net row
        rows.push({
          event_id: eventId,
          company_id: companyId,
          type: "parcela",
          amount: applyFee(totalSaldoGross, saldoFeeRate),
          gross_amount: totalSaldoGross,
          card_fee_percent: saldoFeeRate,
          card_installments: saldoParcelas,
          card_operator_id: operator?.id || null,
          due_date: pd.saldo_data || format(new Date(), "yyyy-MM-dd"),
          payment_method: saldoForma,
          status: "pending",
        });
      } else {
        // CASE C: non-card → keep individual parcelas
        if (pd.parcelas_details && pd.parcelas_details.length > 0) {
          pd.parcelas_details.forEach((p: any) => {
            if (p.valor && p.valor > 0) {
              rows.push({
                event_id: eventId,
                company_id: companyId,
                type: "parcela",
                amount: p.valor,
                due_date: p.vencimento || pd.saldo_data || format(new Date(), "yyyy-MM-dd"),
                payment_method: saldoForma || null,
                status: "pending",
              });
            }
          });
        } else if (pd.saldo_valor && pd.saldo_valor > 0) {
          rows.push({
            event_id: eventId,
            company_id: companyId,
            type: "parcela",
            amount: pd.saldo_valor,
            due_date: pd.saldo_data || format(new Date(), "yyyy-MM-dd"),
            payment_method: saldoForma || null,
            status: "pending",
          });
        }
      }
    } else if (!saldoIsCard) {
      // Há parcela paga: o comportamento legado não recriava NADA e o restante do
      // plano sumia da tela Financeiro (caso Herly/Mega Magic — as parcelas 3-6
      // não apareciam e um "bolo" de ajuste tomava o lugar). Quando o plano bate
      // com o saldo e as pagas casam com o plano, recria só as pendentes,
      // preservando valores e datas combinadas. Se algo não bate (dado torto),
      // pendingPlanParcelas devolve null e nada muda em relação ao legado.
      const paidSaldoRows = paidPayments.filter(
        (p: any) => p.type === "parcela" && !isOpcionalParcel(p) && !isAdjustmentRow(p),
      );
      const pendingPlan = pendingPlanParcelas(pd.parcelas_details, pd.saldo_valor, paidSaldoRows);
      if (pendingPlan) {
        pendingPlan.forEach((p: any) => {
          if (p.valor && p.valor > 0) {
            rows.push({
              event_id: eventId,
              company_id: companyId,
              type: "parcela",
              amount: p.valor,
              due_date: p.vencimento || pd.saldo_data || format(new Date(), "yyyy-MM-dd"),
              payment_method: saldoForma || null,
              status: "pending",
            });
          }
        });
      }
    }

    // Etapa 3: gerar parcelas dos blocos extras (múltiplas formas de pagamento)
    // Cada bloco tem prefixo de notes "[bloco:<id>]" para preservar parcelas já pagas via selective sync.
    const blocks: any[] = Array.isArray(pd.payment_blocks) ? pd.payment_blocks : [];
    if (blocks.length > 0) {
      const today = format(new Date(), "yyyy-MM-dd");
      for (const b of blocks) {
        const blockId = String(b.id || crypto.randomUUID());
        const blockTag = `[bloco:${blockId}]`;
        const bForma = String(b.forma || "");
        const bValor = Number(b.valor) || 0;
        if (bValor <= 0) continue;
        // Data informada pelo usuário (data da venda no cartão, ou 1º vencimento de boleto/PIX). Fallback: hoje.
        const bStartDate = (typeof b.start_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.start_date)) ? b.start_date : today;
        // Selective sync: se este bloco já tem alguma parcela paga, não regenera
        const blockHasPaid = paidPayments.some((p: any) => String(p.notes || "").startsWith(blockTag));
        if (blockHasPaid) continue;

        const bIsCard = bForma === "cartao" || bForma === "cartao_credito" || bForma === "cartao_debito";
        const bIsDebit = bForma === "cartao_debito";
        const bParcelas = bIsDebit ? 1 : Math.max(1, Number(b.parcelas) || 1);
        const bFeeRate = getCardFeeRate(bForma, bParcelas);
        // Operadora específica do bloco (se informada) — senão usa a padrão do evento
        const blockOperator: any = (() => {
          if (b.card_operator_id) {
            const f = effectiveCardFees.find((x: any) => x.id === b.card_operator_id);
            if (f) return f;
          }
          return getCardOperator();
        })();
        const blockFeeRate = bIsCard && blockOperator
          ? (bIsDebit ? Number(blockOperator.taxa_debito || 0)
            : Number(blockOperator[`taxa_credito_${Math.min(12, Math.max(1, bParcelas))}x`] || 0))
          : bFeeRate;

        const isNonAntecipado = bIsCard && !bIsDebit && blockOperator && blockOperator.antecipado === false && bParcelas > 1 && blockFeeRate > 0;

        if (bIsCard && blockFeeRate > 0 && isNonAntecipado) {
          // CASE A: cartão não-antecipado → N parcelas mensais líquidas
          const { splitNonAntecipadoInstallments } = await import("@/lib/cardFees");
          const prazoDias = Number(blockOperator.prazo_recebimento_dias) || 30;
          const slices = splitNonAntecipadoInstallments(bValor, blockFeeRate, bParcelas, bStartDate, prazoDias);
          if (slices) {
            const grossPerSlice = Math.round((bValor / bParcelas) * 100) / 100;
            for (const slice of slices) {
              rows.push({
                event_id: eventId, company_id: companyId, type: "parcela",
                amount: slice.amount, gross_amount: grossPerSlice,
                card_fee_percent: blockFeeRate, card_installments: bParcelas,
                card_operator_id: blockOperator.id,
                due_date: slice.due_date, payment_method: bForma, status: "pending",
                notes: `${blockTag} Parcela ${slice.index}/${slice.total} — Cartão ${bParcelas}x ${blockOperator.operator_name || ""} (sem antecipação)`,
              });
            }
          }
        } else if (bIsCard && blockFeeRate > 0) {
          // CASE B: cartão antecipado / débito → consolida em 1 linha líquida
          rows.push({
            event_id: eventId, company_id: companyId, type: "parcela",
            amount: applyFee(bValor, blockFeeRate), gross_amount: bValor,
            card_fee_percent: blockFeeRate, card_installments: bParcelas,
            card_operator_id: blockOperator?.id || null,
            due_date: bStartDate, payment_method: bForma, status: "pending",
            notes: `${blockTag} Cartão ${bParcelas}x${blockOperator?.operator_name ? ` — ${blockOperator.operator_name}` : ""}`,
          });
        } else {
          // CASE C: PIX / boleto / dinheiro → N parcelas mensais simples
          const perParcela = Math.round((bValor / bParcelas) * 100) / 100;
          for (let i = 0; i < bParcelas; i++) {
            const d = new Date(bStartDate + "T12:00:00");
            d.setMonth(d.getMonth() + i);
            const due = d.toISOString().split("T")[0];
            rows.push({
              event_id: eventId, company_id: companyId, type: "parcela",
              amount: perParcela, due_date: due,
              payment_method: bForma || null, status: "pending",
              notes: `${blockTag} Parcela ${i + 1}/${bParcelas}${bForma ? ` — ${bForma}` : ""}`,
            });
          }
        }
      }
    }

    if (rows.length > 0) {
      await supabase.from("event_payments").insert(rows);
    }
    return "ok";
  } catch (err) {
    console.error("[syncPaymentDetails] error:", err);
    return "ok";
  }
}

export function warnPaymentsNotRebuilt(sync: PaymentSyncResult) {
  if (sync === "partial_receipts") {
    toast({
      title: "Parcelas não foram refeitas",
      description: "Esta festa tem recebimento parcial lançado. Para não perder esse recebimento, ajuste as parcelas no Financeiro da festa.",
    });
  } else if (sync === "check_failed") {
    toast({
      title: "Parcelas não foram refeitas",
      description: "Não deu para conferir os pagamentos agora. Salve de novo em instantes.",
      variant: "destructive",
    });
  }
}

/**
 * Cria ou atualiza a festa com a regra da Agenda: todos os campos, parcelas pelo
 * plano de pagamento e modelo de checklist. Devolve o id da festa (null se deu erro;
 * o aviso de erro já aparece na tela).
 */
export async function saveEvent(
  data: EventFormData,
  ctx: { companyId: string; userId: string; leadId?: string | null },
): Promise<string | null> {
  const payload = buildEventPayload(data, ctx.companyId);
  if (!payload.lead_id && ctx.leadId) payload.lead_id = ctx.leadId;

  if (data.id) {
    const { data: before } = await supabase.from("company_events").select("payment_details").eq("id", data.id).maybeSingle();
    const planChanged = !samePaymentPlan(before?.payment_details, data.payment_details);
    const { error } = await supabase.from("company_events").update(payload).eq("id", data.id);
    if (error) {
      toast({ title: "Erro ao atualizar a festa", description: error.message, variant: "destructive" });
      return null;
    }
    const sync = await syncEventPayments(data.id, ctx.companyId, data.payment_details, { planChanged });
    toast({ title: "Festa atualizada!" });
    warnPaymentsNotRebuilt(sync);
    return data.id;
  }

  const { data: created, error } = await supabase
    .from("company_events")
    .insert({ ...payload, created_by: ctx.userId })
    .select("id")
    .single();
  if (error || !created) {
    toast({ title: "Erro ao criar a festa", description: error?.message, variant: "destructive" });
    return null;
  }
  if (data.checklist_template_id && data.checklist_template_id !== "none") {
    const { data: tmpl } = await supabase.from("event_checklist_templates").select("items").eq("id", data.checklist_template_id).single();
    if (tmpl && Array.isArray(tmpl.items)) {
      const items = (tmpl.items as string[]).map((title: string, idx: number) => ({
        event_id: created.id,
        company_id: ctx.companyId,
        title,
        sort_order: idx,
      }));
      await supabase.from("event_checklist_items").insert(items);
    }
  }
  await syncEventPayments(created.id, ctx.companyId, data.payment_details);
  toast({ title: "Festa criada!" });
  return created.id;
}
