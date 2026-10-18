import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, FileText, Images, Loader2, Trash2, Upload, Video } from "lucide-react";
import { loadAiMaterials, removeAiMaterial, uploadAiMaterial, type AiMaterial, type MaterialKind } from "@/lib/aiMaterials";
import { AiImagesEditor } from "./AiImagesEditor";

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
  // Faixa do próximo PDF (vazio = vale para todas as quantidades)
  const [pdfGuests, setPdfGuests] = useState("");
  const videoRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => setMaterials(await loadAiMaterials(companyId)), [companyId]);
  useEffect(() => { reload(); }, [reload]);

  const video = materials.find((m) => m.type === "video");
  const pdfs = materials.filter((m) => m.type === "pdf_package");
  const collection = materials.find((m) => m.type === "photo_collection");
  const photoCount = collection?.photo_urls?.length || sitePhotos.length;

  const upload = async (kind: MaterialKind, file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_MB[kind] * 1024 * 1024) {
      toast({ title: `O arquivo precisa ter até ${MAX_MB[kind]} MB`, description: kind === "video" ? "Grave um vídeo mais curto (até 1 minuto) ou envie em qualidade menor." : undefined, variant: "destructive" });
      return;
    }
    const guests = kind === "pdf" ? parseInt(pdfGuests.replace(/\D/g, ""), 10) || null : null;
    if (kind === "pdf" && guests && pdfs.some((p) => p.guest_count === guests)) {
      toast({ title: `Já tem um PDF para ${guests} convidados`, description: "Tire o antigo antes de enviar outro para a mesma quantidade.", variant: "destructive" });
      return;
    }
    setBusy(kind);
    try {
      const name = kind === "pdf" ? (guests ? `Pacotes ${guests} convidados` : "Pacotes e cardápio") : "Vídeo do buffet";
      await uploadAiMaterial(companyId, unit, kind, file, name, guests);
      await reload();
      if (kind === "pdf") setPdfGuests("");
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
        {item(pdfs.length > 0)}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium"><FileText className="h-4 w-4" /> Pacotes e cardápio (PDF)</p>
          <p className="text-xs text-muted-foreground">
            O PDF com os pacotes, valores e o cardápio. Se você tem um PDF para cada quantidade de convidados, envie um por vez
            dizendo a quantidade: a IA manda o da faixa do cliente.
          </p>
          {pdfs.length > 0 && (
            <ul className="space-y-1.5">
              {pdfs.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-2.5 py-1.5 text-sm">
                  <a href={p.file_url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
                    {p.guest_count ? `Para ${p.guest_count} convidados` : "Para todas as quantidades"}
                  </a>
                  <button type="button" disabled={!!busy} aria-label="Tirar PDF" className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      try { await removeAiMaterial(p.id); await reload(); } catch (e) {
                        toast({ title: "Não consegui tirar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
                      }
                    }}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Input value={pdfGuests} onChange={(e) => setPdfGuests(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric"
              placeholder="Convidados (opcional)" className="h-9 w-44" aria-label="Para quantos convidados é este PDF" />
            <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => pdfRef.current?.click()}>
              {busy === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {pdfs.length ? "Adicionar outro PDF" : "Enviar PDF"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Deixe "Convidados" vazio se o PDF vale para qualquer quantidade.</p>
          <input ref={pdfRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => upload("pdf", e.target.files?.[0])} />
        </div>
      </div>

      <AiImagesEditor companyId={companyId} />

      <p className="text-xs text-muted-foreground">
        Pode pular e enviar depois em Configurações → Empresa e WhatsApp → Conteúdo → Materiais (a imagem da primeira mensagem fica em Minha IA).
      </p>
    </div>
  );
}
