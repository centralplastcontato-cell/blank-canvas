import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, BadgeDollarSign, CalendarDays, CheckCircle2, Clock, FolderOpen, Globe, ImagePlus, Loader2, PartyPopper, Sparkles, Store, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { serializeBuffetInfo } from "@/lib/aiBuffetFields";
import { serializeTeamHours, serializeVisitHours } from "@/lib/businessHours";
import { buildSiteDraft, siteSubdomain } from "@/lib/siteBuilder";
import { resizeImageFile } from "@/lib/imageResize";
import { syncSitePhotosCollection } from "@/lib/aiMaterials";
import { MaterialsQuickSetup } from "@/components/setup/MaterialsQuickSetup";
import { PricesQuickSetup, type PricesQuickSetupHandle } from "@/components/setup/PricesQuickSetup";
import { AiTestChat } from "@/components/setup/AiTestChat";
import {
  BUSY_NOTE, buildPartySlots, dayKey, hasTerm, monthsAhead, SATURDAY, SETUP_SELECTS, SETUP_SUGGESTIONS, toggleTerm, type SetupAnswers, type Slot, WEEKDAYS,
} from "@/lib/selfSetup";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

const STEPS = [
  { id: "buffet", title: "Seu buffet", icon: Store },
  { id: "ia", title: "Atendimento da IA", icon: Sparkles },
  { id: "agenda", title: "Datas ocupadas", icon: CalendarDays },
  { id: "site", title: "Seu site", icon: Globe },
  { id: "materiais", title: "Fotos, vídeo e PDF", icon: FolderOpen },
  { id: "valores", title: "Valores", icon: BadgeDollarSign },
  { id: "fim", title: "Concluir", icon: PartyPopper },
] as const;

interface BusyEvent { id: string; event_date: string; start_time: string | null; end_time: string | null; mine: boolean }

async function invokeFn(name: string, body: Json): Promise<Json> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      const j = ctx ? await ctx.json() : null;
      if (j?.error) msg = j.error;
    } catch { /* mensagem genérica */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data as Json;
}

/** Sugestões prontas: toca para adicionar no texto, toca de novo para tirar */
function Suggestions({ items, value, onChange }: { items: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => {
        const on = hasTerm(value, t);
        return (
          <button key={t} type="button" onClick={() => onChange(toggleTerm(value, t))}
            className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground")}>
            {on ? "✓ " : "+ "}{t}
          </button>
        );
      })}
    </div>
  );
}

/** Passo a passo do buffet que se cadastrou sozinho: buffet → IA → datas ocupadas → site → concluir */
export default function SetupBuffet() {
  const navigate = useNavigate();
  const { currentCompany, isLoading: companyLoading, refreshCompanies } = useCompany();
  const companyId = currentCompany?.id ?? null;
  const signup = ((currentCompany?.settings as Json | undefined)?.signup || null) as Json | null;
  const unit: string = signup?.unit || currentCompany?.name || "";

  const [step, setStep] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Passo 1 — buffet
  const [address, setAddress] = useState("");
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  // Passo 2 — IA
  const [ans, setAns] = useState<SetupAnswers>({
    assistant_name: "Ana",
    slots: [{ start: "13:00", end: "17:00" }, { start: "19:00", end: "23:00" }],
    visit_days: [0, 1, 2, 3, 4], visit_start: "10:00", visit_end: "17:00",
    team_days: [0, 1, 2, 3, 4, 5], team_start: "09:00", team_end: "18:00",
    visit_sat_diff: false, visit_sat_start: "09:00", visit_sat_end: "13:00",
    team_sat_diff: false, team_sat_start: "09:00", team_sat_end: "13:00",
    duracao: "4 horas", estrutura: "", diferenciais: "", comida_externa: "", monitores: "", regras: "", proibido: "",
  });

  // Passo 3 — agenda
  const [busy, setBusy] = useState<BusyEvent[]>([]);
  const [openDay, setOpenDay] = useState<string | null>(null);

  // Passo 4 — site
  const [siteExists, setSiteExists] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);
  const pricesRef = useRef<PricesQuickSetupHandle>(null);

  // Passo 5
  const [agendaOk, setAgendaOk] = useState(false);
  const [testOpen, setTestOpen] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    const today = dayKey(new Date());
    const [{ data: onb }, { data: ai }, { data: evs }, { data: lp }] = await Promise.all([
      supabase.from("company_onboarding").select("full_address, instagram, whatsapp_numbers, city, state, photo_urls, current_step").eq("company_id", companyId).maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("ai_agent_settings").select("assistant_name, party_slots, extra_instructions").eq("company_id", companyId).maybeSingle(),
      supabase.from("company_events").select("id, event_date, start_time, end_time, internal_notes, status").eq("company_id", companyId).gte("event_date", today),
      supabase.from("company_landing_pages").select("id").eq("company_id", companyId).maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("ai_questionnaires").select("answers").eq("company_id", companyId).maybeSingle().then((r: Json) => {
        if (r.data?.answers?.setup) setAns((a) => ({ ...a, ...r.data.answers.setup }));
        return r;
      }),
    ]);
    setAddress(onb?.full_address || "");
    setInstagram(onb?.instagram || "");
    setWhatsapp((onb?.whatsapp_numbers as string[] | null)?.[0] || "");
    setCity(onb?.city || "");
    setUf(onb?.state || "");
    setPhotos((onb?.photo_urls as string[] | null) || []);
    setLogoUrl(currentCompany?.logo_url || null);
    if (ai?.assistant_name) setAns((a) => ({ ...a, assistant_name: ai.assistant_name }));
    setBusy(((evs || []) as Json[]).filter((e) => e.status !== "cancelado").map((e) => ({
      id: e.id, event_date: e.event_date, start_time: e.start_time, end_time: e.end_time, mine: e.internal_notes === BUSY_NOTE,
    })));
    setSiteExists(!!lp);
    // Volta para a etapa onde parou (current_step começa em 1)
    setStep(Math.min(Math.max(Number(onb?.current_step || 1) - 1, 0), STEPS.length - 1));
    setLoading(false);
  }, [companyId, currentCompany?.logo_url]);

  useEffect(() => { load(); }, [load]);

  const slots: Slot[] = useMemo(() => ans.slots.filter((s) => s.start && s.end), [ans.slots]);

  if (companyLoading || (loading && companyId)) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…</div>;
  }
  if (!currentCompany || !companyId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="space-y-3"><p>Entre na sua conta para continuar o cadastro.</p><Button onClick={() => navigate("/auth")}>Entrar</Button></div>
      </div>
    );
  }

  const status = signup?.status as string | undefined;
  if (!status) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="space-y-3"><p>Este passo a passo é só para buffets que se cadastraram pelo site.</p><Button onClick={() => navigate("/atendimento")}>Ir para a plataforma</Button></div>
      </div>
    );
  }
  if (status === "aguardando_aprovacao" || status === "aprovado") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF9F3] p-6">
        <Card className="max-w-md">
          <CardContent className="space-y-4 pt-6 text-center">
            <PartyPopper className="mx-auto h-10 w-10 text-[#E0457A]" />
            {status === "aprovado" ? (
              <>
                <p className="text-lg font-semibold">Seu buffet está no ar! 🎉</p>
                <p className="text-sm text-muted-foreground">Se ainda não leu o QR Code do WhatsApp, vá em Configurações → WhatsApp → Conexão.</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold">Cadastro enviado!</p>
                <p className="text-sm text-muted-foreground">A equipe Celebrei vai conectar o seu WhatsApp e ligar a IA. Avisamos você assim que estiver pronto (normalmente em até 1 dia útil).</p>
              </>
            )}
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => setTestOpen(true)}><Sparkles className="mr-2 h-4 w-4" /> Testar a minha IA</Button>
              <Button onClick={() => navigate("/atendimento")}>Ir para a plataforma</Button>
            </div>
          </CardContent>
        </Card>
        {companyId && <AiTestChat open={testOpen} onOpenChange={setTestOpen} companyId={companyId} />}
      </div>
    );
  }

  // ── Salvar cada passo ───────────────────────────────────────────────────
  const saveBuffet = async (): Promise<boolean> => {
    if (address.trim().length < 8) { toast({ title: "Escreva o endereço completo do buffet", variant: "destructive" }); return false; }
    if (whatsapp.replace(/\D/g, "").length < 10) { toast({ title: "Escreva o WhatsApp de atendimento (com DDD)", variant: "destructive" }); return false; }
    const { error } = await supabase.from("company_onboarding").update({
      full_address: address.trim(), instagram: instagram.trim().replace(/^@/, "") || null,
      whatsapp_numbers: [whatsapp.replace(/\D/g, "")], city: city.trim() || null, state: uf.trim().toUpperCase() || null,
    }).eq("company_id", companyId);
    if (error) { toast({ title: "Não consegui salvar", description: error.message, variant: "destructive" }); return false; }
    if (logoUrl !== currentCompany.logo_url) await supabase.from("companies").update({ logo_url: logoUrl }).eq("id", companyId);
    return true;
  };

  const saveAi = async (): Promise<boolean> => {
    const missing = [
      [ans.assistant_name.trim(), "o nome da assistente"],
      [slots.length > 0, "os horários das festas"],
      [ans.visit_days.length > 0, "os dias de visita"],
      [ans.estrutura.trim(), "a estrutura do buffet"],
      [ans.diferenciais.trim(), "os diferenciais"],
      [ans.comida_externa, "se pode levar comida de fora"],
      [ans.monitores, "sobre os monitores"],
    ].find(([ok]) => !ok);
    if (missing) { toast({ title: `Falta responder ${missing[1]}`, variant: "destructive" }); return false; }
    const info = serializeBuffetInfo({
      endereco: address.trim(), duracao: ans.duracao, estrutura: ans.estrutura, diferenciais: ans.diferenciais,
      comida_externa: ans.comida_externa, monitores: ans.monitores,
      regras: [ans.regras.trim(), ans.proibido.trim() ? `A IA nunca deve: ${ans.proibido.trim()}` : ""].filter(Boolean).join("\n"),
    });
    const payload = {
      company_id: companyId, enabled: false, unit,
      assistant_name: ans.assistant_name.trim(),
      party_slots: buildPartySlots(slots),
      visit_hours: serializeVisitHours(ans.visit_days, ans.visit_start, ans.visit_end, true, !!ans.visit_sat_diff, ans.visit_sat_start || "", ans.visit_sat_end || ""),
      team_hours: serializeTeamHours(ans.team_days, ans.team_start, ans.team_end, !!ans.team_sat_diff, ans.team_sat_start || "", ans.team_sat_end || ""),
      extra_instructions: info,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: existing } = await sb.from("ai_agent_settings").select("id").eq("company_id", companyId).maybeSingle();
    const { error } = existing
      ? await sb.from("ai_agent_settings").update(payload).eq("company_id", companyId)
      : await sb.from("ai_agent_settings").insert(payload);
    if (error) { toast({ title: "Não consegui salvar as respostas", description: error.message, variant: "destructive" }); return false; }
    await sb.from("ai_questionnaires").upsert({ company_id: companyId, answers: { setup: ans }, status: "rascunho", updated_at: new Date().toISOString() }, { onConflict: "company_id" });
    return true;
  };

  const ensureSite = async (): Promise<boolean> => {
    // As fotos do site também são as fotos que a IA manda no WhatsApp
    await syncSitePhotosCollection(companyId, unit, photos).catch(() => undefined);
    if (siteExists) {
      if (photos.length) {
        const { data: lp } = await supabase.from("company_landing_pages").select("hero, gallery").eq("company_id", companyId).maybeSingle();
        if (lp) {
          await supabase.from("company_landing_pages").update({
            hero: { ...(lp.hero as Json), background_image_url: photos[0], background_images: photos.slice(0, 3) },
            gallery: { ...(lp.gallery as Json), enabled: true, photos },
          } as never).eq("company_id", companyId);
        }
      }
      return true;
    }
    const draft = buildSiteDraft({ companyName: currentCompany.name, city, state: uf, fullAddress: address, photoUrls: photos, whatsapp });
    const { error } = await supabase.from("company_landing_pages").insert({ company_id: companyId, is_published: false, ...draft } as never);
    if (error) { toast({ title: "Não consegui criar o site", description: error.message, variant: "destructive" }); return false; }
    await supabase.from("company_onboarding").update({ photo_urls: photos }).eq("company_id", companyId);
    setSiteExists(true);
    return true;
  };

  const next = async () => {
    setSaving(true);
    try {
      const id = STEPS[step].id;
      const ok = id === "buffet" ? await saveBuffet() : id === "ia" ? await saveAi() : id === "site" ? await ensureSite() : id === "valores" ? await (pricesRef.current?.save() ?? true) : true;
      if (ok) {
        const nextStep = Math.min(step + 1, STEPS.length - 1);
        setStep(nextStep);
        window.scrollTo(0, 0);
        await supabase.from("company_onboarding").update({ current_step: nextStep + 1 }).eq("company_id", companyId);
      }
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      await invokeFn("self-signup", { action: "finish", company_id: companyId, agenda_ok: agendaOk });
      await refreshCompanies();
      toast({ title: "Cadastro enviado! 🎉" });
    } catch (e) {
      toast({ title: "Não consegui concluir", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Uploads ─────────────────────────────────────────────────────────────
  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    setSaving(true);
    try {
      // PNG para manter o fundo transparente da logo
      const { base64, type } = await resizeImageFile(file, 600, "image/png");
      const r = await invokeFn("site-builder", { action: "upload-photo", company_id: companyId, base64, content_type: type });
      setLogoUrl(r.url);
    } catch (e) {
      toast({ title: "Não consegui enviar a logo", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setSaving(false);
      if (logoRef.current) logoRef.current.value = "";
    }
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files) return;
    setSaving(true);
    const added: string[] = [];
    try {
      for (const f of Array.from(files).filter((x) => x.type.startsWith("image/")).slice(0, 12 - photos.length)) {
        const { base64, type } = await resizeImageFile(f, 1600);
        const r = await invokeFn("site-builder", { action: "upload-photo", company_id: companyId, base64, content_type: type });
        added.push(r.url);
      }
    } catch (e) {
      toast({ title: "Algumas fotos não foram enviadas", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setPhotos((p) => [...p, ...added]);
      setSaving(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  };

  // ── Agenda ──────────────────────────────────────────────────────────────
  const busyOn = (day: string) => busy.filter((b) => b.event_date === day);
  const toggleBusy = async (day: string, slot: Slot | null) => {
    if (!userId) return;
    const match = busyOn(day).find((b) => (slot ? b.start_time?.slice(0, 5) === slot.start : b.start_time === null));
    if (match) {
      if (!match.mine) { toast({ title: "Essa festa foi cadastrada na agenda", description: "Para tirar, vá na Agenda." }); return; }
      const { error } = await supabase.from("company_events").delete().eq("id", match.id);
      if (error) { toast({ title: "Não consegui desmarcar", description: error.message, variant: "destructive" }); return; }
      setBusy((b) => b.filter((x) => x.id !== match.id));
      return;
    }
    const { data, error } = await supabase.from("company_events").insert({
      company_id: companyId, created_by: userId, event_date: day, title: "Data ocupada", status: "confirmado", unit,
      start_time: slot ? `${slot.start}:00` : null, end_time: slot ? `${slot.end}:00` : null, internal_notes: BUSY_NOTE,
    }).select("id").single();
    if (error) { toast({ title: "Não consegui marcar", description: error.message, variant: "destructive" }); return; }
    setBusy((b) => [...b, { id: data.id, event_date: day, start_time: slot ? `${slot.start}:00` : null, end_time: slot ? `${slot.end}:00` : null, mine: true }]);
  };

  const dayClick = (day: string) => {
    if (slots.length <= 1) toggleBusy(day, null);
    else setOpenDay(day);
  };

  const months = monthsAhead(new Date(), 12);
  const today = dayKey(new Date());
  const setA = <K extends keyof SetupAnswers>(k: K, v: SetupAnswers[K]) => setAns((a) => ({ ...a, [k]: v }));
  const toggleDay = (k: "visit_days" | "team_days", d: number) =>
    setA(k, ans[k].includes(d) ? ans[k].filter((x) => x !== d) : [...ans[k], d].sort());

  return (
    <div className="min-h-screen bg-[#FFF9F3] px-4 py-8">
      <Helmet><title>Cadastro do buffet | Celebrei</title></Helmet>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">{currentCompany.name}</p>
          <h1 className="text-2xl font-bold">Vamos deixar seu buffet pronto</h1>
        </div>

        {/* Etapas */}
        <ol className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
          {STEPS.map((s, i) => (
            <li key={s.id} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
              i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />} {s.title}
            </li>
          ))}
        </ol>

        <Card>
          <CardContent className="space-y-5 pt-6">
            {STEPS[step].id === "buffet" && (
              <>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => logoRef.current?.click()} className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-muted text-xs text-muted-foreground">
                    {logoUrl ? <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" /> : "Logo"}
                  </button>
                  <div className="text-sm text-muted-foreground">Toque para enviar a logo do buffet (opcional).</div>
                  <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-address">Endereço completo</Label>
                  <Input id="s-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua das Flores, 123 - Centro" />
                </div>
                <div className="grid grid-cols-[1fr_88px] gap-3">
                  <div className="space-y-2"><Label htmlFor="s-city">Cidade</Label><Input id="s-city" value={city} onChange={(e) => setCity(e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="s-uf">UF</Label><Input id="s-uf" value={uf} maxLength={2} onChange={(e) => setUf(e.target.value)} /></div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="s-whats">WhatsApp de atendimento</Label>
                    <Input id="s-whats" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(15) 99999-0000" />
                    <p className="text-xs text-muted-foreground">O número que a IA vai atender.</p>
                  </div>
                  <div className="space-y-2"><Label htmlFor="s-insta">Instagram (opcional)</Label><Input id="s-insta" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@meubuffet" /></div>
                </div>
              </>
            )}

            {STEPS[step].id === "ia" && (
              <>
                <p className="text-sm text-muted-foreground">A IA só fala o que estiver aqui. O que ela não souber, ela passa para a sua equipe.</p>
                <div className="space-y-2">
                  <Label htmlFor="s-ai-name">1. Nome da assistente</Label>
                  <Input id="s-ai-name" value={ans.assistant_name} onChange={(e) => setA("assistant_name", e.target.value)} maxLength={30} />
                </div>
                <div className="space-y-2">
                  <Label>2. Horários das festas</Label>
                  {ans.slots.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input type="time" aria-label={`Início da festa ${i + 1}`} value={s.start} onChange={(e) => setA("slots", ans.slots.map((x, j) => j === i ? { ...x, start: e.target.value } : x))} className="w-32" />
                      <span className="text-sm text-muted-foreground">às</span>
                      <Input type="time" aria-label={`Fim da festa ${i + 1}`} value={s.end} onChange={(e) => setA("slots", ans.slots.map((x, j) => j === i ? { ...x, end: e.target.value } : x))} className="w-32" />
                      {ans.slots.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label="Remover horário" onClick={() => setA("slots", ans.slots.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  ))}
                  {ans.slots.length < 4 && <Button type="button" variant="outline" size="sm" onClick={() => setA("slots", [...ans.slots, { start: "", end: "" }])}>+ Outro horário</Button>}
                </div>
                {([["visit", "3. Dias e horários de visita ao espaço"], ["team", "4. Horário da equipe no WhatsApp"]] as const).map(([k, label]) => (
                  <div key={k} className="space-y-2">
                    <Label>{label}</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAYS.map((d, i) => (
                        <button key={d} type="button" onClick={() => toggleDay(`${k}_days`, i)}
                          className={cn("rounded-full border px-3 py-1 text-xs", ans[`${k}_days`].includes(i) ? "border-primary bg-primary text-primary-foreground" : "bg-background")}>{d}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input type="time" aria-label="Das" value={ans[`${k}_start`]} onChange={(e) => setA(`${k}_start`, e.target.value)} className="w-32" />
                      <span className="text-sm text-muted-foreground">às</span>
                      <Input type="time" aria-label="Até" value={ans[`${k}_end`]} onChange={(e) => setA(`${k}_end`, e.target.value)} className="w-32" />
                    </div>
                    {ans[`${k}_days`].includes(SATURDAY) && (
                      <>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={!!ans[`${k}_sat_diff`]} onCheckedChange={(v) => setA(`${k}_sat_diff`, v === true)} />
                          Sábado em outro horário
                        </label>
                        {ans[`${k}_sat_diff`] && (
                          <div className="flex items-center gap-2">
                            <span className="w-4 text-xs font-semibold text-muted-foreground">Sáb</span>
                            <Input type="time" aria-label="Sábado das" value={ans[`${k}_sat_start`] || ""} onChange={(e) => setA(`${k}_sat_start`, e.target.value)} className="w-32" />
                            <span className="text-sm text-muted-foreground">às</span>
                            <Input type="time" aria-label="Sábado até" value={ans[`${k}_sat_end`] || ""} onChange={(e) => setA(`${k}_sat_end`, e.target.value)} className="w-32" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
                <div className="space-y-2">
                  <Label htmlFor="s-dur">5. Duração da festa</Label>
                  <Input id="s-dur" value={ans.duracao} onChange={(e) => setA("duracao", e.target.value)} placeholder="4 horas" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-est">6. O que o espaço tem (estrutura e brinquedos)</Label>
                  <Textarea id="s-est" rows={3} value={ans.estrutura} onChange={(e) => setA("estrutura", e.target.value)} placeholder="Salão climatizado para 120 pessoas, brinquedão, cama elástica, piscina de bolinhas, fraldário…" />
                  <Suggestions items={SETUP_SUGGESTIONS.estrutura} value={ans.estrutura} onChange={(v) => setA("estrutura", v)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-dif">7. Por que escolher vocês (diferenciais)</Label>
                  <Textarea id="s-dif" rows={3} value={ans.diferenciais} onChange={(e) => setA("diferenciais", e.target.value)} placeholder="10 anos de tradição, monitores o tempo todo, estacionamento próprio…" />
                  <Suggestions items={SETUP_SUGGESTIONS.diferenciais} value={ans.diferenciais} onChange={(v) => setA("diferenciais", v)} />
                  <p className="text-xs text-muted-foreground">Toque nas sugestões ou escreva do seu jeito. Só coloque o que é verdade: a IA vai usar isso com os clientes.</p>
                </div>
                {SETUP_SELECTS.map((q, i) => (
                  <div key={q.key} className="space-y-2">
                    <Label>{8 + i}. {q.label}</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {q.options.map((o) => (
                        <button key={o} type="button" onClick={() => setA(q.key, o)}
                          className={cn("rounded-full border px-3 py-1.5 text-xs text-left", ans[q.key] === o ? "border-primary bg-primary text-primary-foreground" : "bg-background")}>{o}</button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="space-y-2">
                  <Label htmlFor="s-regras">10. Regras e o que vocês não fazem</Label>
                  <Textarea id="s-regras" rows={2} value={ans.regras} onChange={(e) => setA("regras", e.target.value)} placeholder="Não fazemos festa fora do buffet. Visita só com hora marcada…" />
                  <Suggestions items={SETUP_SUGGESTIONS.regras} value={ans.regras} onChange={(v) => setA("regras", v)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-proibido">O que a IA NUNCA deve dizer ou prometer (opcional)</Label>
                  <Textarea id="s-proibido" rows={2} value={ans.proibido} onChange={(e) => setA("proibido", e.target.value)} placeholder="Dar desconto, garantir data sem contrato…" />
                  <Suggestions items={SETUP_SUGGESTIONS.proibido} value={ans.proibido} onChange={(v) => setA("proibido", v)} />
                </div>
              </>
            )}

            {STEPS[step].id === "agenda" && (
              <>
                <div className="space-y-1">
                  <p className="font-medium">Marque as datas que já estão ocupadas</p>
                  <p className="text-sm text-muted-foreground">
                    Toque no dia para marcar ou desmarcar. Não precisa dos dados da festa — só a data{slots.length > 1 ? " e o horário" : ""}.
                    Assim a IA nunca oferece uma data que já está tomada.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#E0457A]" /> Dia todo ocupado</span>
                    {slots.length > 1 && <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#E0457A]/30" /> Algum horário ocupado</span>}
                    <span className="font-medium text-primary">{busy.length} marcação(ões)</span>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {months.map((m) => (
                    <div key={m.key}>
                      <p className="mb-2 text-sm font-semibold first-letter:uppercase">{m.label}</p>
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
                        {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => <span key={i}>{d}</span>)}
                      </div>
                      <div className="mt-1 grid grid-cols-7 gap-1">
                        {Array.from({ length: m.offset }).map((_, i) => <span key={`e${i}`} />)}
                        {m.days.map((day) => {
                          const n = busyOn(day).length;
                          const past = day < today;
                          const full = busyOn(day).some((b) => b.start_time === null) || (slots.length > 1 && n >= slots.length);
                          return (
                            <button key={day} type="button" disabled={past} onClick={() => dayClick(day)}
                              className={cn("aspect-square rounded-md text-xs transition-colors",
                                past ? "text-muted-foreground/40" : full ? "bg-[#E0457A] font-semibold text-white" : n ? "bg-[#E0457A]/30 font-semibold" : "hover:bg-muted")}>
                              {Number(day.slice(8))}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <Dialog open={!!openDay} onOpenChange={(o) => !o && setOpenDay(null)}>
                  <DialogContent className="max-w-xs">
                    <DialogHeader><DialogTitle>{openDay && new Date(`${openDay}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</DialogTitle></DialogHeader>
                    {openDay && (
                      <div className="space-y-2">
                        {[null, ...slots].map((s) => {
                          const on = busyOn(openDay).some((b) => (s ? b.start_time?.slice(0, 5) === s.start : b.start_time === null));
                          return (
                            <button key={s ? s.start : "all"} type="button" onClick={() => toggleBusy(openDay, s)}
                              className={cn("flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm", on && "border-[#E0457A] bg-[#E0457A]/10")}>
                              {s ? `${s.start} às ${s.end}` : "Dia todo"}
                              {on ? <span className="text-xs font-semibold text-[#E0457A]">Ocupado</span> : <span className="text-xs text-muted-foreground">Livre</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </>
            )}

            {STEPS[step].id === "site" && (
              <>
                <div className="space-y-1">
                  <p className="font-medium">Fotos para o site</p>
                  <p className="text-sm text-muted-foreground">
                    Com elas montamos o site do buffet em <span className="font-medium text-foreground">{siteSubdomain(currentCompany.slug)}</span>.
                    Os botões do site abrem o seu WhatsApp e a IA atende. Depois dá para mudar tudo em Configurações → Meu site.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => photoRef.current?.click()} disabled={saving || photos.length >= 12}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />} Adicionar fotos ({photos.length}/12)
                </Button>
                <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadPhotos(e.target.files)} />
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {photos.map((p, i) => (
                      <div key={p} className="relative aspect-square overflow-hidden rounded-lg border">
                        <img src={p} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                        <button type="button" aria-label="Remover foto" className="absolute right-1 top-1 rounded bg-white/90 p-1" onClick={() => setPhotos(photos.filter((x) => x !== p))}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {STEPS[step].id === "materiais" && (
              <MaterialsQuickSetup companyId={companyId} unit={unit} sitePhotos={photos} />
            )}

            {STEPS[step].id === "valores" && <PricesQuickSetup ref={pricesRef} companyId={companyId} />}

            {STEPS[step].id === "fim" && (
              <>
                <p className="font-medium">Quase lá!</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Dados do buffet</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Respostas da IA</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> {busy.length} data(s) ocupada(s) marcada(s)</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Site em rascunho</li>
                </ul>
                <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                  <Checkbox checked={agendaOk} onCheckedChange={(v) => setAgendaOk(v === true)} className="mt-0.5" />
                  <span>Confirmo que <strong>todas as datas já ocupadas</strong> estão marcadas. A IA vai oferecer como livres as datas que não estiverem.</span>
                </label>
                <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="text-sm font-medium">Veja como a sua IA vai atender</p>
                  <p className="text-xs text-muted-foreground">Converse com ela como se fosse um cliente. Se algo sair errado, volte nos passos e ajuste antes de enviar.</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => setTestOpen(true)}><Sparkles className="mr-2 h-4 w-4" /> Testar a minha IA</Button>
                </div>
                <p className="text-sm text-muted-foreground">Depois de enviar, a equipe Celebrei conecta o seu WhatsApp e liga a IA.</p>
                <AiTestChat open={testOpen} onOpenChange={setTestOpen} companyId={companyId} />
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between gap-2">
          <Button variant="ghost" disabled={step === 0 || saving} onClick={() => setStep((s) => s - 1)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
          {STEPS[step].id === "fim" ? (
            <Button onClick={finish} disabled={!agendaOk || saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar cadastro</Button>
          ) : (
            <Button onClick={next} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Continuar <ArrowRight className="ml-2 h-4 w-4" /></Button>
          )}
        </div>
      </div>
    </div>
  );
}
