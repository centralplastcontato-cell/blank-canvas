import { useEffect, useState } from "react";
import { Film, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { mensagemDaFuncao } from "@/lib/edgeFunctionError";

// Hub → Instagram: posta um vídeo (Reels) pronto, agendado no Postaí. Vídeos prontos da
// Celebrei ficam no site (public/videos); outro vídeo sobe direto para o Storage.

type Pronto = { id: string; titulo: string; video: string; capa: string; legenda: string; hashtags: string };

const VIDEOS_PRONTOS: Pronto[] = [
  {
    id: "venda",
    titulo: "Novo Celebrei — vídeo de venda (2min59s)",
    video: "/videos/celebrei-venda-reels.mp4",
    capa: "/videos/celebrei-venda-reels.jpg",
    legenda:
      "Quantas festas você perdeu esse mês porque alguém demorou pra responder no WhatsApp? 😬\n\n" +
      "O cliente pede orçamento pra 3, 4 buffets ao mesmo tempo. Quem responde primeiro, e melhor, leva a festa. 🎉\n\n" +
      "O atendimento Celebrei responde em segundos, tira as dúvidas, olha a sua agenda, marca e confirma a visita, chama de volta quem sumiu e atende até de madrugada. 💜\n\n" +
      "Criado por um dono de buffet, para dono de buffet.\n\n" +
      "👉 Teste grátis: hubcelebrei.com.br/comecar",
    hashtags: "#buffetinfantil #festainfantil #donodebuffet #buffet #festas #whatsapp #atendimento #inteligenciaartificial #celebrei",
  },
];

const OUTRO = "outro";

/** Próximo horário bom (19:30, hoje ou amanhã) no formato do campo datetime-local */
function horarioPadrao(agora = new Date()) {
  const d = new Date(agora);
  d.setHours(19, 30, 0, 0);
  if (d.getTime() - agora.getTime() < 30 * 60e3) d.setDate(d.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

async function chama<T>(corpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("hub-instagram", { body: corpo });
  if (error) throw new Error(await mensagemDaFuncao(error));
  return data as T;
}

/** Sobe o arquivo direto no Storage (link assinado pela função) e devolve o link público */
async function sobe(arquivo: File): Promise<string> {
  const r = await chama<{ caminho: string; token: string; url: string }>({ acao: "reels_upload", tipo: arquivo.type });
  const { error } = await supabase.storage.from("hub-instagram").uploadToSignedUrl(r.caminho, r.token, arquivo, { contentType: arquivo.type });
  if (error) throw new Error(`Não consegui enviar ${arquivo.name}: ${error.message}`);
  return r.url;
}

export function HubReelsDialog({ open, onOpenChange, onDone }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: (aviso: string) => void;
}) {
  const [escolha, setEscolha] = useState(VIDEOS_PRONTOS[0].id);
  const [video, setVideo] = useState<File | null>(null);
  const [capa, setCapa] = useState<File | null>(null);
  const [legenda, setLegenda] = useState(VIDEOS_PRONTOS[0].legenda);
  const [hashtags, setHashtags] = useState(VIDEOS_PRONTOS[0].hashtags);
  const [horario, setHorario] = useState(horarioPadrao());
  const [enviando, setEnviando] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!open) return;
    setErro("");
    setHorario(horarioPadrao());
  }, [open]);

  const pronto = VIDEOS_PRONTOS.find((v) => v.id === escolha) || null;
  const escolher = (id: string) => {
    setEscolha(id);
    const v = VIDEOS_PRONTOS.find((x) => x.id === id);
    setLegenda(v ? v.legenda : "");
    setHashtags(v ? v.hashtags : "");
  };

  const enviar = async () => {
    setErro("");
    try {
      if (!pronto && !video) throw new Error("Escolha o vídeo.");
      const quando = new Date(horario);
      if (Number.isNaN(quando.getTime())) throw new Error("Escolha a data e a hora.");
      let urlVideo: string, urlCapa: string | null = null;
      if (pronto) {
        urlVideo = new URL(pronto.video, window.location.origin).href;
        urlCapa = new URL(pronto.capa, window.location.origin).href;
      } else {
        setEnviando("Enviando o vídeo…");
        urlVideo = await sobe(video!);
        if (capa) {
          setEnviando("Enviando a capa…");
          urlCapa = await sobe(capa);
        }
      }
      setEnviando("Agendando no Postaí…");
      const r = await chama<{ vaga: string; envio: string | null }>({
        acao: "reels",
        video: urlVideo,
        capa: urlCapa,
        legenda,
        hashtags,
        horario: quando.toISOString(),
        titulo: pronto?.titulo || video?.name || "Vídeo",
      });
      onDone(`Vídeo agendado para ${r.vaga}. ${r.envio || ""}`.trim());
      onOpenChange(false);
      setVideo(null);
      setCapa(null);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !enviando && onOpenChange(v)}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogTitle className="flex items-center gap-2"><Film className="h-5 w-5 text-primary" /> Postar vídeo (Reels)</DialogTitle>
        <DialogDescription>Vai agendado para o Postaí, que publica no @hubcelebrei. Vale mesmo com a automação pausada.</DialogDescription>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Vídeo</Label>
            {VIDEOS_PRONTOS.map((v) => (
              <label key={v.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2 ${escolha === v.id ? "border-primary bg-primary/5" : "border-border"}`}>
                <input type="radio" name="reels-video" checked={escolha === v.id} onChange={() => escolher(v.id)} className="accent-primary" />
                <img src={v.capa} alt="" className="h-16 w-9 rounded object-cover" />
                <span className="text-sm font-medium">{v.titulo}</span>
              </label>
            ))}
            <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${escolha === OUTRO ? "border-primary bg-primary/5" : "border-border"}`}>
              <input type="radio" name="reels-video" checked={escolha === OUTRO} onChange={() => escolher(OUTRO)} className="accent-primary" />
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Outro vídeo do computador ou celular</span>
            </label>
            {escolha === OUTRO && (
              <div className="space-y-2 rounded-xl bg-secondary/50 p-3 text-sm">
                <div className="space-y-1">
                  <Label htmlFor="reels-arquivo">Vídeo (MP4 ou MOV, até 100 MB, de preferência em pé 9:16)</Label>
                  <Input id="reels-arquivo" type="file" accept="video/mp4,video/quicktime" onChange={(e) => setVideo(e.target.files?.[0] || null)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reels-capa">Capa (opcional, JPG ou PNG)</Label>
                  <Input id="reels-capa" type="file" accept="image/jpeg,image/png" onChange={(e) => setCapa(e.target.files?.[0] || null)} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="reels-quando">Publicar em</Label>
            <Input id="reels-quando" type="datetime-local" value={horario} onChange={(e) => setHorario(e.target.value)} />
            <p className="text-xs text-muted-foreground">Pelo menos 15 minutos a partir de agora. Dica: 19h a 21h, de terça a quinta.</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="reels-legenda">Legenda</Label>
            <Textarea id="reels-legenda" rows={8} value={legenda} onChange={(e) => setLegenda(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reels-hashtags">Hashtags</Label>
            <Input id="reels-hashtags" value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
          </div>

          {erro && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive" role="alert">{erro}</p>}

          <Button className="w-full" disabled={!!enviando} onClick={enviar}>
            {enviando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {enviando}</> : "Agendar no Postaí"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
