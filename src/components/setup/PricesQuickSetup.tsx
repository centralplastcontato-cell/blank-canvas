import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { formatPrice } from "@/lib/siteBuilder";

/** Colunas da tabela (as mesmas que a função self-signup grava) */
const DAYS = [
  { key: "seg_qui", label: "Seg a Qui" },
  { key: "sexta", label: "Sexta" },
  { key: "sab_dom", label: "Sáb e Dom" },
] as const;
const DEFAULT_TIERS = [50, 70, 100];

interface Pkg { id?: string; name: string; prices: Record<string, string> }

export interface PricesQuickSetupHandle {
  /** Salva (se tiver algo preenchido). Devolve false se deu erro. */
  save: () => Promise<boolean>;
}

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("self-signup", { body });
  let msg: string | undefined = data?.error;
  if (error && !msg) {
    try { msg = (await (error as { context?: Response }).context?.json())?.error; } catch { /* genérica */ }
    msg = msg || error.message;
  }
  if (msg) throw new Error(msg);
  return data;
}

/** Campo de dinheiro (como app de banco): os dois últimos números são os centavos */
const money = (raw: string) => {
  const d = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9);
  return d ? formatPrice(Number(d) / 100) : "";
};
const toNumber = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;

/** Passo "Valores": a tabela que a IA usa para responder "quanto fica?" */
export const PricesQuickSetup = forwardRef<PricesQuickSetupHandle, { companyId: string }>(({ companyId }, ref) => {
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<number[]>(DEFAULT_TIERS);
  const [newTier, setNewTier] = useState("");
  const [pkgs, setPkgs] = useState<Pkg[]>([{ name: "Pacote", prices: {} }]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    call({ action: "prices-load", company_id: companyId })
      .then((r) => {
        if (cancelled) return;
        if (Array.isArray(r?.guest_tiers) && r.guest_tiers.length) setTiers(r.guest_tiers);
        if (Array.isArray(r?.packages) && r.packages.length) {
          setPkgs(r.packages.map((p: { id: string; name: string; prices: Record<string, number> }) => ({
            id: p.id, name: p.name,
            prices: Object.fromEntries(Object.entries(p.prices || {}).map(([k, v]) => [k, formatPrice(Number(v))])),
          })));
        }
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [companyId]);

  const filled = pkgs.some((p) => Object.values(p.prices).some((v) => toNumber(v) > 0));

  useImperativeHandle(ref, () => ({
    save: async () => {
      setError(null);
      if (!filled) return true; // pulou: a IA manda o PDF de pacotes
      try {
        const r = await call({
          action: "prices-save", company_id: companyId, guest_tiers: tiers,
          packages: pkgs.map((p) => ({ id: p.id, name: p.name, prices: Object.fromEntries(Object.entries(p.prices).map(([k, v]) => [k, toNumber(v)])) })),
        });
        if (Array.isArray(r?.packages)) setPkgs((list) => list.map((p, i) => ({ ...p, id: r.packages[i] ?? p.id })));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      }
    },
  }), [companyId, filled, pkgs, tiers]);

  const addTier = () => {
    const n = parseInt(newTier.replace(/\D/g, ""), 10);
    if (!n || n < 5 || tiers.includes(n)) return;
    setTiers([...tiers, n].sort((a, b) => a - b));
    setNewTier("");
  };
  const setPrice = (pi: number, key: string, raw: string) =>
    setPkgs((list) => list.map((p, i) => (i === pi ? { ...p, prices: { ...p.prices, [key]: money(raw) } } : p)));

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="font-medium">Valores dos pacotes</p>
        <p className="text-sm text-muted-foreground">
          Com esta tabela a IA responde na hora "quanto fica para 80 pessoas no sábado?". Feriado usa o valor do dia da semana.
          Se preferir não informar valores, deixe em branco: a IA manda o PDF de pacotes.
        </p>
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-medium">Faixas de convidados</p>
        <div className="flex flex-wrap gap-2">
          {tiers.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-sm">
              {t} convidados
              {tiers.length > 1 && (
                <button type="button" aria-label={`Tirar ${t}`} className="text-muted-foreground hover:text-destructive" onClick={() => setTiers(tiers.filter((x) => x !== t))}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newTier} onChange={(e) => setNewTier(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric"
            placeholder="Ex.: 80" className="h-9 w-28" aria-label="Nova faixa de convidados"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTier(); } }} />
          <Button type="button" size="sm" variant="outline" onClick={addTier}><Plus className="mr-1 h-4 w-4" /> Faixa</Button>
        </div>
      </div>

      {pkgs.map((p, pi) => (
        <div key={p.id || `novo-${pi}`} className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Input value={p.name} maxLength={60} aria-label="Nome do pacote" className="h-9 font-medium"
              onChange={(e) => setPkgs((list) => list.map((x, i) => (i === pi ? { ...x, name: e.target.value } : x)))} />
            {pkgs.length > 1 && (
              <button type="button" aria-label="Tirar pacote" className="text-muted-foreground hover:text-destructive" onClick={() => setPkgs(pkgs.filter((_, i) => i !== pi))}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-[64px_1fr_1fr_1fr] items-center gap-1.5 text-[11px] text-muted-foreground">
            <span />
            {DAYS.map((d) => <span key={d.key} className="text-center font-medium">{d.label}</span>)}
            {tiers.map((t) => (
              <div key={t} className="contents">
                <span className="text-xs font-medium text-foreground">{t} pess.</span>
                {DAYS.map((d) => (
                  <Input key={d.key} inputMode="numeric" placeholder="0,00" className="h-9 px-1.5 text-center text-xs"
                    aria-label={`${p.name}, ${t} convidados, ${d.label}`}
                    value={p.prices[`${t}_${d.key}`] || ""} onChange={(e) => setPrice(pi, `${t}_${d.key}`, e.target.value)} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}

      {pkgs.length < 4 && (
        <Button type="button" size="sm" variant="outline" onClick={() => setPkgs([...pkgs, { name: `Pacote ${pkgs.length + 1}`, prices: {} }])}>
          <Plus className="mr-1 h-4 w-4" /> Outro pacote
        </Button>
      )}

      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">Depois dá para mudar em Operações → Pacotes.</p>
    </div>
  );
});
PricesQuickSetup.displayName = "PricesQuickSetup";
