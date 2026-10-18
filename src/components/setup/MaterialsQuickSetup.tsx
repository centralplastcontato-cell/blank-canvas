import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileText, Images, Loader2, Upload, Video } from "lucide-react";
import { loadAiMaterials, uploadAiMaterial, type AiMaterial, type MaterialKind } from "@/lib/aiMaterials";

interface Props {
  companyId: string;
  /** Unidade do buffet (a IA procura os materiais pela unidade do número) */
  unit: string;
  /** Fotos do site: viram a coleção que a IA manda */
  sitePhotos: string[];
}

const MAX_MB: Record<MaterialKind, number> = { video: 50, pdf: 20 };

/** Passo "Materiais" do cadastro: fotos (do site), 1 vídeo e o PDF de pacotes/cardápio */
export function MaterialsQuickSetup({ companyId, unit, sitePhotos }: Props) {
  const [materials, setMaterials] = useState<AiMaterial[]>([]);
  const [busy, setBusy] = useState<MaterialKind | null>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => setMaterials(await loadAiMaterials(companyId)), [companyId]);
  useEffect(() => { reload(); }, [reload]);

  const video = materials.find((m) => m.type === "video");
  const pdf = materials.find((m) => m.type === "pdf_package");
  const collection = materials.find((m) => m.type === "photo_collection");
  const photoCount = collection?.photo_urls?.length || sitePhotos.length;

  const upload = async (kind: MaterialKind, file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_MB[kind] * 1024 * 1024) {
      toast({ title: `O arquivo precisa ter até ${MAX_MB[kind]} MB`, description: kind === "video" ? "Grave um vídeo mais curto (até 1 minuto) ou envie em qualidade menor." : undefined, variant: "destructive" });
      return;
    }
    setBusy(kind);
    try {
      await uploadAiMaterial(companyId, unit, kind, file, kind === "pdf" ? "Pacotes e cardápio" : "Vídeo do buffet");
      await reload();
      toast({ title: kind === "pdf" ? "PDF enviado!" : "Vídeo enviado!" });
    } catch (e) {
      toast({ title: "Não consegui enviar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(null);
      if (videoRef.current) videoRef.current.value = "";
      if (pdfRef.current) pdfRef.current.value = "";
    }
  };

  const item = (done: boolean) => done
    ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
    : <span className="h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground/30" />;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="font-medium">O que a IA manda no WhatsApp</p>
        <p className="text-sm text-muted-foreground">
          Quando o cliente pede fotos, vídeo ou valores, a IA manda estes materiais. Sem eles, ela só consegue responder por texto.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border p-3">
        {item(photoCount > 0)}
        <div className="flex-1 space-y-1">
          <p className="flex items-center gap-1.5 text-sm font-medium"><Images className="h-4 w-4" /> Fotos do buffet</p>
          <p className="text-xs text-muted-foreground">
            {photoCount > 0
              ? `Usamos as ${photoCount} foto(s) do site. A IA manda até 6 quando o cliente pede fotos.`
              : "Volte um passo e adicione fotos no site: elas também são as fotos que a IA manda."}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border p-3">
        {item(!!video)}
        <div className="flex-1 space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium"><Video className="h-4 w-4" /> Vídeo do buffet</p>
          <p className="text-xs text-muted-foreground">Um vídeo curto mostrando o salão e os brinquedos (até 1 minuto, {MAX_MB.video} MB).</p>
          <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => videoRef.current?.click()}>
            {busy === "video" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {video ? "Trocar vídeo" : "Enviar vídeo"}
          </Button>
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => upload("video", e.target.files?.[0])} />
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border p-3">
        {item(!!pdf)}
        <div className="flex-1 space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium"><FileText className="h-4 w-4" /> Pacotes e cardápio (PDF)</p>
          <p className="text-xs text-muted-foreground">O PDF com os pacotes, valores e o cardápio. É o que a IA manda quando pedem orçamento.</p>
          <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => pdfRef.current?.click()}>
            {busy === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {pdf ? "Trocar PDF" : "Enviar PDF"}
          </Button>
          <input ref={pdfRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => upload("pdf", e.target.files?.[0])} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Pode pular e enviar depois em Configurações → Empresa e WhatsApp → Conteúdo → Materiais.
      </p>
    </div>
  );
}
