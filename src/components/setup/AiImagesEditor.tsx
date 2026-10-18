import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { resizeImageFile } from "@/lib/imageResize";
import { normalizeFollowUpConfig, type AiFollowUpConfig } from "@/lib/aiFollowUp";

/**
 * Imagens da IA: a da 1ª mensagem (vai com a apresentação, como a frente do
 * Castelo) e, opcionalmente, as dos follow-ups. Grava nos mesmos campos da tela
 * completa (Automações → IA): ai_agent_settings.intro_image_url e as imagens de
 * followup_config. Não liga nem desliga nada, só troca as imagens.
 */
export function AiImagesEditor({ companyId, showFollowUps = false }: { companyId: string; showFollowUps?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);
  const [intro, setIntro] = useState<string | null>(null);
  const [fu, setFu] = useState<AiFollowUpConfig | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<string>("intro");

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("ai_agent_settings").select("*").eq("company_id", companyId).maybeSingle()
      .then(({ data }: { data: Record<string, unknown> | null }) => {
        if (cancelled) return;
        setExists(!!data);
        setIntro((data?.intro_image_url as string) || null);
        setFu(normalizeFollowUpConfig(data?.followup_config));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [companyId]);

  const save = async (patch: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("ai_agent_settings").update(patch).eq("company_id", companyId);
    if (error) throw new Error(error.message);
  };

  // key: "intro", "step-0".."step-5" ou "reactivation"
  const apply = async (key: string, url: string | null) => {
    setBusy(key);
    try {
      if (key === "intro") {
        await save({ intro_image_url: url });
        setIntro(url);
      } else if (fu) {
        const next: AiFollowUpConfig = key === "reactivation"
          ? { ...fu, reactivation: { ...fu.reactivation, image_url: url } }
          : { ...fu, steps: fu.steps.map((s, i) => (`step-${i}` === key ? { ...s, image_url: url } : s)) };
        await save({ followup_config: next });
        setFu(next);
      }
      toast({ title: url ? "Imagem salva" : "Imagem tirada" });
    } catch (e) {
      toast({ title: "Não consegui salvar a imagem", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const key = target.current;
    setBusy(key);
    try {
      const { base64, type } = await resizeImageFile(file, 1600);
      const { data, error } = await supabase.functions.invoke("site-builder", { body: { action: "upload-photo", company_id: companyId, base64, content_type: type } });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Falha no envio");
      await apply(key, data.url as string);
    } catch (e) {
      toast({ title: "Não consegui enviar a imagem", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
      setBusy(null);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const pick = (key: string) => { target.current = key; fileRef.current?.click(); };

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (!exists) return <p className="text-xs text-muted-foreground">Responda as perguntas da IA antes de colocar as imagens.</p>;

  const slot = (key: string, title: string, help: string, url: string | null | undefined) => (
    <div key={key} className="flex items-start gap-3 rounded-lg border p-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{help}</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => pick(key)}>
            {busy === key ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="mr-1.5 h-3.5 w-3.5" />}
            {url ? "Trocar" : "Escolher imagem"}
          </Button>
          {url && (
            <Button type="button" size="sm" variant="ghost" disabled={!!busy} onClick={() => apply(key, null)} aria-label="Tirar imagem">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const when = (h: number) => (h % 24 === 0 ? `${h / 24} dia(s)` : `${h} hora(s)`);

  return (
    <div className="space-y-2">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      {slot("intro", "Imagem da primeira mensagem", "Vai junto com a apresentação da IA, na primeira resposta ao cliente. Uma foto bonita da frente do buffet funciona bem.", intro)}
      {showFollowUps && fu && (
        <>
          <p className="pt-2 text-sm font-medium">Imagens dos follow-ups</p>
          <p className="text-xs text-muted-foreground">
            Vão junto com a mensagem que a IA manda para quem parou de responder.
            {fu.enabled ? " Os follow-ups estão ligados." : " Os follow-ups ainda estão desligados: a equipe Celebrei liga quando a IA estiver no ar."}
          </p>
          {fu.steps.map((s, i) => slot(`step-${i}`, `${i + 1}º follow-up`, `Sai ${when(s.delay_hours)} depois que o cliente parou de responder.`, s.image_url))}
          {fu.reactivation.enabled && slot("reactivation", "Lembrete antes da festa", `Vai ${fu.reactivation.days_before.join(" e ")} dias antes da data, para quem ainda não fechou.`, fu.reactivation.image_url)}
        </>
      )}
    </div>
  );
}
