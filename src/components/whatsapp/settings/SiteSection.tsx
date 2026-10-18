import { useCallback, useEffect, useRef, useState } from "react";
import { upcomingMonthOptions } from "@/lib/partyDate";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ExternalLink, Globe, ImagePlus, Loader2, RefreshCw, Save, Sparkles, Star, Trash2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { resizeImageFile } from "@/lib/imageResize";
import { GuestRangesEditor } from "./GuestRangesEditor";
import {
  buildSiteDraft,
  isSiteBuilderPage,
  normalizeCustomDomain,
  offerTitleFromPrice,
  onlyDigits,
  paletteTheme,
  SITE_PALETTES,
  siteSubdomain,
  type SiteContent,
} from "@/lib/siteBuilder";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

interface DomainStatus {
  domain: string | null;
  ready?: boolean;
  records?: Array<{ type: string; name: string; value: string; ok: boolean }>;
  verification?: Array<{ type: string; domain: string; value: string }> | null;
}

const MAX_PHOTOS = 12;

/** Chama a função do site e devolve a mensagem de erro dela (não a genérica do supabase-js) */
async function callSiteBuilder(body: Json): Promise<Json> {
  const { data, error } = await supabase.functions.invoke("site-builder", { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      const j = ctx ? await ctx.json() : null;
      if (j?.error) msg = j.error;
    } catch { /* mantém a mensagem genérica */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data as Json;
}

export function SiteSection() {
  const { currentCompany, refreshCompanies } = useCompany();
  const companyId = currentCompany?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [rowExists, setRowExists] = useState(false);
  const [published, setPublished] = useState(false);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [handMade, setHandMade] = useState(false);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [domain, setDomain] = useState<DomainStatus | null>(null);
  const [whatsConnected, setWhatsConnected] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data: lp } = await supabase.from("company_landing_pages").select("*").eq("company_id", companyId).maybeSingle();
    if (!lp) {
      setRowExists(false);
      setContent(null);
      setHandMade(false);
    } else if (!isSiteBuilderPage(lp.hero)) {
      setRowExists(true);
      setHandMade(true);
      setPublished(!!lp.is_published);
    } else {
      setRowExists(true);
      setHandMade(false);
      setPublished(!!lp.is_published);
      const c = {
        hero: lp.hero, benefits: lp.benefits, gallery: lp.gallery, offer: lp.offer, how_it_works: lp.how_it_works,
        footer: lp.footer, theme: lp.theme, video: lp.video, testimonials: lp.testimonials, social_proof: lp.social_proof,
      } as unknown as SiteContent;
      setContent(c);
      const m = (c.offer?.title || "").match(/R\$\s*([\d.]+)/);
      setPrice(m ? m[1] : "");
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  // As perguntas antes do WhatsApp só funcionam com o número do buffet conectado
  useEffect(() => {
    if (!companyId) return;
    supabase.from("wapi_instances").select("id").eq("company_id", companyId).eq("status", "connected").eq("is_active", true).limit(1)
      .then(({ data }) => setWhatsConnected(!!data?.length));
  }, [companyId]);

  const loadDomain = useCallback(async () => {
    if (!companyId || !currentCompany?.domain_canonical) { setDomain(null); return; }
    try {
      setDomain(await callSiteBuilder({ action: "domain-status", company_id: companyId }) as DomainStatus);
    } catch { setDomain({ domain: currentCompany.domain_canonical }); }
  }, [companyId, currentCompany?.domain_canonical]);

  useEffect(() => { if (!handMade) loadDomain(); }, [loadDomain, handMade]);

  if (!currentCompany || !companyId) return null;
  const subdomainUrl = `https://${siteSubdomain(currentCompany.slug)}`;
  const liveUrl = currentCompany.custom_domain && domain?.ready ? `https://${currentCompany.custom_domain}` : subdomainUrl;

  // ── Criar o rascunho a partir do cadastro ───────────────────────────────
  const createDraft = async () => {
    setBusy("create");
    try {
      const [{ data: onb }, { data: inst }] = await Promise.all([
        supabase.from("company_onboarding").select("city, state, full_address, photo_urls, whatsapp_numbers").eq("company_id", companyId).maybeSingle(),
        supabase.from("wapi_instances").select("phone_number").eq("company_id", companyId).eq("status", "connected").not("phone_number", "is", null).limit(1),
      ]);
      const draft = buildSiteDraft({
        companyName: currentCompany.name,
        city: onb?.city,
        state: onb?.state,
        fullAddress: onb?.full_address,
        photoUrls: (onb?.photo_urls as string[] | null) || [],
        whatsapp: inst?.[0]?.phone_number || (onb?.whatsapp_numbers as string[] | null)?.[0] || null,
      });
      const { error } = await supabase.from("company_landing_pages").insert({ company_id: companyId, is_published: false, ...draft } as never);
      if (error) throw error;
      toast({ title: "Rascunho do site criado!", description: "Confira os textos e as fotos e depois publique." });
      await load();
    } catch (e) {
      toast({ title: "Não consegui criar o site", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  // ── Edição ──────────────────────────────────────────────────────────────
  const patch = <K extends keyof SiteContent>(key: K, value: Partial<SiteContent[K]>) =>
    setContent((c) => (c ? { ...c, [key]: { ...c[key], ...value } } : c));

  const setBenefit = (i: number, field: "title" | "description", value: string) =>
    setContent((c) => {
      if (!c) return c;
      const items = [...(c.benefits.items || [])];
      items[i] = { ...items[i], [field]: value };
      return { ...c, benefits: { ...c.benefits, items } };
    });

  const setPhotos = (photos: string[]) =>
    setContent((c) => (c ? {
      ...c,
      gallery: { ...c.gallery, enabled: photos.length > 0, photos },
      hero: { ...c.hero, background_image_url: photos[0] || null, background_images: photos.slice(0, 3) },
    } : c));

  const save = async (silent = false): Promise<boolean> => {
    if (!content) return false;
    if (!onlyDigits(content.hero.whatsapp_number)) {
      toast({ title: "Falta o WhatsApp do site", description: "É para ele que os botões do site levam o cliente.", variant: "destructive" });
      return false;
    }
    if (!silent) setBusy("save");
    try {
      const offer = { ...content.offer, title: offerTitleFromPrice(price) };
      const { error } = await supabase.from("company_landing_pages").update({
        hero: { ...content.hero, whatsapp_number: onlyDigits(content.hero.whatsapp_number) },
        benefits: content.benefits,
        gallery: content.gallery,
        offer,
        footer: content.footer,
        theme: paletteTheme(content.hero.palette),
      } as never).eq("company_id", companyId);
      if (error) throw error;
      if (!silent) toast({ title: "Site salvo!", description: published ? "As mudanças já estão no ar." : "Quando estiver pronto, clique em Publicar." });
      return true;
    } catch (e) {
      toast({ title: "Não consegui salvar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
      return false;
    } finally {
      if (!silent) setBusy(null);
    }
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files || !content) return;
    const room = MAX_PHOTOS - (content.gallery.photos?.length || 0);
    const list = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, room));
    if (list.length === 0) {
      toast({ title: `Máximo de ${MAX_PHOTOS} fotos`, variant: "destructive" });
      return;
    }
    setBusy("photos");
    const added: string[] = [];
    try {
      for (const f of list) {
        const { base64, type } = await resizeImageFile(f, 1600);
        const r = await callSiteBuilder({ action: "upload-photo", company_id: companyId, base64, content_type: type });
        added.push(r.url);
      }
    } catch (e) {
      toast({ title: "Algumas fotos não foram enviadas", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      if (added.length) setPhotos([...(content.gallery.photos || []), ...added]);
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const publish = async () => {
    if (!(await save(true))) return;
    setBusy("publish");
    try {
      const r = await callSiteBuilder({ action: "publish", company_id: companyId });
      setPublished(true);
      toast({ title: "Site publicado! 🎉", description: r.url });
    } catch (e) {
      toast({ title: "Não consegui publicar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const unpublish = async () => {
    setBusy("unpublish");
    const { error } = await supabase.from("company_landing_pages").update({ is_published: false }).eq("company_id", companyId);
    setBusy(null);
    if (error) toast({ title: "Não consegui tirar do ar", description: error.message, variant: "destructive" });
    else { setPublished(false); toast({ title: "Site fora do ar", description: "Ele continua salvo como rascunho." }); }
  };

  // ── Domínio próprio ─────────────────────────────────────────────────────
  const connectDomain = async () => {
    const d = normalizeCustomDomain(domainInput);
    if (!d) {
      toast({ title: "Domínio inválido", description: "Escreva só o endereço, por exemplo: meubuffet.com.br", variant: "destructive" });
      return;
    }
    setBusy("domain");
    try {
      setDomain(await callSiteBuilder({ action: "set-domain", company_id: companyId, domain: d }) as DomainStatus);
      setDomainInput("");
      await refreshCompanies();
    } catch (e) {
      toast({ title: "Não consegui conectar o domínio", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const removeDomain = async () => {
    setBusy("domain-remove");
    try {
      await callSiteBuilder({ action: "remove-domain", company_id: companyId });
      setDomain(null);
      await refreshCompanies();
      toast({ title: "Domínio removido", description: `O site continua em ${siteSubdomain(currentCompany.slug)}.` });
    } catch (e) {
      toast({ title: "Não consegui remover", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando o site…</div>;
  }

  if (handMade) {
    return (
      <Card className="max-w-xl">
        <CardContent className="pt-6 space-y-3">
          <p className="font-medium">Seu site foi feito sob medida pela equipe Celebrei.</p>
          <p className="text-sm text-muted-foreground">Para mudar textos, fotos ou o endereço, fale com a gente que ajustamos para você.</p>
          {published && (
            <Button variant="outline" asChild>
              <a href={currentCompany.custom_domain ? `https://${currentCompany.custom_domain}` : `/lp/${currentCompany.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> Ver site
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!rowExists || !content) {
    return (
      <Card className="max-w-xl">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
            <div className="space-y-1">
              <p className="font-medium">Crie o site do seu buffet em 1 minuto</p>
              <p className="text-sm text-muted-foreground">
                Montamos a página com os dados do seu cadastro. Os botões abrem o seu WhatsApp e a IA atende na hora.
                Depois é só conferir os textos, colocar as fotos e publicar em <span className="font-medium text-foreground">{siteSubdomain(currentCompany.slug)}</span>.
              </p>
            </div>
          </div>
          <Button onClick={createDraft} disabled={busy === "create"}>
            {busy === "create" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Criar meu site
          </Button>
        </CardContent>
      </Card>
    );
  }

  const photos = content.gallery.photos || [];
  const items = content.benefits.items || [];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Situação */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={published ? "default" : "secondary"}>{published ? "No ar" : "Rascunho"}</Badge>
            <a href={liveUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline break-all">
              {liveUrl.replace("https://", "")}
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            {published ? (
              <>
                <Button variant="outline" asChild>
                  <a href={liveUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Ver site</a>
                </Button>
                <Button variant="ghost" onClick={unpublish} disabled={!!busy}>
                  {busy === "unpublish" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Tirar do ar
                </Button>
              </>
            ) : (
              <Button onClick={publish} disabled={!!busy}>
                {busy === "publish" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
                Publicar site
              </Button>
            )}
          </div>
          {!published && <p className="text-xs text-muted-foreground">Na primeira publicação o endereço pode levar alguns minutos para abrir.</p>}
        </CardContent>
      </Card>

      {/* Textos */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <p className="font-medium">Textos do topo</p>
          <div className="space-y-2">
            <Label htmlFor="site-title">Título</Label>
            <Input id="site-title" value={content.hero.title} maxLength={90} onChange={(e) => patch("hero", { title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-subtitle">Frase de apoio</Label>
            <Textarea id="site-subtitle" rows={3} value={content.hero.subtitle} maxLength={220} onChange={(e) => patch("hero", { subtitle: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="site-cta">Texto do botão</Label>
              <Input id="site-cta" value={content.hero.cta_text} maxLength={40} onChange={(e) => patch("hero", { cta_text: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-whats">WhatsApp do site</Label>
              <Input id="site-whats" inputMode="tel" placeholder="(15) 99999-0000" value={content.hero.whatsapp_number || ""} onChange={(e) => patch("hero", { whatsapp_number: e.target.value })} />
              <p className="text-xs text-muted-foreground">O número que a IA atende.</p>
            </div>
          </div>
          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Perguntas antes do WhatsApp</p>
              <p className="text-xs text-muted-foreground">
                O cliente responde no site o mês, o dia, os convidados, o nome e o WhatsApp. O contato já entra na plataforma e a IA
                manda a primeira mensagem sabendo esses dados. Desligado, o botão abre o WhatsApp direto.
              </p>
              {!whatsConnected && <p className="text-xs text-muted-foreground">Enquanto o WhatsApp do buffet não estiver conectado, no fim o cliente toca num botão e manda os dados pelo WhatsApp dele.</p>}
            </div>
            <Switch
              checked={content.hero.cta_mode === "chatbot"}
              onCheckedChange={(v) => {
                patch("hero", { cta_mode: v ? "chatbot" : "whatsapp" });
                // Sem essa linha o contato do site não é direcionado ao número conectado
                // Meses com ano (Novembro/26...), trocando sozinhos todo mês, como no Castelo
                if (v) supabase.from("lp_bot_settings").upsert(
                  { company_id: companyId, month_options: upcomingMonthOptions(), auto_rotate_months: true },
                  { onConflict: "company_id", ignoreDuplicates: true },
                ).then(() => {});
              }}
              aria-label="Perguntas antes do WhatsApp"
            />
          </div>
          {content.hero.cta_mode === "chatbot" && <GuestRangesEditor companyId={companyId} />}
        </CardContent>
      </Card>

      {/* Fotos */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium">Fotos ({photos.length}/{MAX_PHOTOS})</p>
              <p className="text-xs text-muted-foreground">A primeira é a capa do site. Use fotos do salão, da festa, da comida e dos brinquedos.</p>
            </div>
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={!!busy || photos.length >= MAX_PHOTOS}>
              {busy === "photos" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
              Adicionar
            </Button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadPhotos(e.target.files)} />
          </div>
          {photos.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma foto ainda. Sem fotos o site fica sem a capa e sem a galeria.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((url, i) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border">
                  <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">Capa</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 p-1">
                    {i > 0 && (
                      <button type="button" title="Usar como capa" className="rounded bg-white/90 p-1" onClick={() => setPhotos([url, ...photos.filter((p) => p !== url)])}>
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button type="button" title="Remover" className="rounded bg-white/90 p-1" onClick={() => setPhotos(photos.filter((p) => p !== url))}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diferenciais */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <p className="font-medium">O que o seu buffet tem de melhor</p>
            <p className="text-xs text-muted-foreground">Três coisas que fazem os pais escolherem vocês.</p>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr]">
              <Input aria-label={`Diferencial ${i + 1}`} placeholder="Ex.: Brinquedão de 3 andares" value={items[i]?.title || ""} maxLength={40} onChange={(e) => setBenefit(i, "title", e.target.value)} />
              <Input aria-label={`Descrição do diferencial ${i + 1}`} placeholder="Uma frase curta explicando" value={items[i]?.description || ""} maxLength={120} onChange={(e) => setBenefit(i, "description", e.target.value)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pacote */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium">Pacotes</p>
              <p className="text-xs text-muted-foreground">Mostra um preço "a partir de" no site. Pode deixar desligado.</p>
            </div>
            <Switch checked={!!content.offer.enabled} onCheckedChange={(v) => patch("offer", { enabled: v })} aria-label="Mostrar pacotes" />
          </div>
          {content.offer.enabled && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="site-price">A partir de (R$)</Label>
                  <Input id="site-price" inputMode="numeric" placeholder="Ex.: 3.900" value={price} onChange={(e) => setPrice(e.target.value)} />
                  {!price.trim() && <p className="text-xs text-muted-foreground">Sem valor, o site mostra só "Conheça nossos pacotes".</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site-offer-desc">Resumo</Label>
                  <Input id="site-offer-desc" placeholder="Ex.: Festa de 4 horas para até 50 convidados" value={content.offer.description} maxLength={140} onChange={(e) => patch("offer", { description: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="site-offer-items">O que está incluso (um por linha)</Label>
                <Textarea id="site-offer-items" rows={4} value={(content.offer.benefits_list || []).join("\n")}
                  onChange={(e) => patch("offer", { benefits_list: e.target.value.split("\n").map((l) => l.trimStart()).slice(0, 8) })} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Endereço e cores */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="site-address">Endereço (aparece no rodapé)</Label>
            <Input id="site-address" placeholder="Rua das Flores, 123 - Centro - Sorocaba/SP" value={content.footer.custom_text || ""} maxLength={160} onChange={(e) => patch("footer", { custom_text: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Cores do site</Label>
            <div className="flex flex-wrap gap-2">
              {SITE_PALETTES.map((p) => (
                <button key={p.id} type="button" onClick={() => patch("hero", { palette: p.id })}
                  className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm", (content.hero.palette || "festa") === p.id && "border-primary ring-2 ring-primary/30")}>
                  <span className="flex -space-x-1">
                    <span className="h-4 w-4 rounded-full border border-white" style={{ background: p.primary }} />
                    <span className="h-4 w-4 rounded-full border border-white" style={{ background: p.secondary }} />
                  </span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => save()} disabled={!!busy} className="w-full sm:w-auto">
        {busy === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Salvar alterações
      </Button>

      {/* Domínio próprio */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <p className="font-medium">Domínio do seu buffet (opcional)</p>
            <p className="text-xs text-muted-foreground">Já tem um endereço, como meubuffet.com.br? Conecte aqui e o site passa a abrir nele também.</p>
          </div>
          {currentCompany.custom_domain ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{currentCompany.custom_domain}</span>
                {domain?.ready ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Funcionando</Badge> : <Badge variant="secondary">Aguardando configuração</Badge>}
              </div>
              {!domain?.ready && domain?.records && (
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">No site onde você comprou o domínio (Registro.br, Hostinger, GoDaddy…), crie estes registros de DNS:</p>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50"><tr><th className="p-2">Tipo</th><th className="p-2">Nome</th><th className="p-2">Valor</th><th className="p-2" /></tr></thead>
                      <tbody>
                        {domain.records.map((r) => (
                          <tr key={r.type + r.name} className="border-t">
                            <td className="p-2 font-mono">{r.type}</td>
                            <td className="p-2 font-mono">{r.name}</td>
                            <td className="p-2 font-mono break-all">{r.value}</td>
                            <td className="p-2">{r.ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}</td>
                          </tr>
                        ))}
                        {(domain.verification || []).map((v) => (
                          <tr key={v.domain + v.value} className="border-t">
                            <td className="p-2 font-mono">{v.type}</td>
                            <td className="p-2 font-mono break-all">{v.domain}</td>
                            <td className="p-2 font-mono break-all">{v.value}</td>
                            <td className="p-2"><XCircle className="h-4 w-4 text-muted-foreground" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground">Depois de salvar no seu provedor, pode levar de alguns minutos a algumas horas para funcionar.</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={loadDomain} disabled={!!busy}><RefreshCw className="mr-2 h-4 w-4" /> Verificar de novo</Button>
                <Button variant="ghost" size="sm" onClick={removeDomain} disabled={!!busy}>
                  {busy === "domain-remove" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Remover domínio
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input placeholder="meubuffet.com.br" value={domainInput} onChange={(e) => setDomainInput(e.target.value)} aria-label="Domínio do buffet" />
              <Button onClick={connectDomain} disabled={!!busy || !domainInput.trim()}>
                {busy === "domain" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Conectar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
