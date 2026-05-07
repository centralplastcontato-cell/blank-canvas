import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Pencil, Plus, Trash2, Loader2, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

interface Variation {
  tone: string;
  text: string;
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  message_variations: any;
  image_url: string | null;
  delay_seconds: number;
  pause_bot_on_reply?: boolean;
  auto_reply_message?: string | null;
  status: string;
}

interface CampaignEditDialogProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function CampaignEditDialog({ campaign, open, onOpenChange, onSaved }: CampaignEditDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [variations, setVariations] = useState<Variation[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [delaySeconds, setDelaySeconds] = useState(60);
  const [pauseBotOnReply, setPauseBotOnReply] = useState(true);
  const [autoReplyMessage, setAutoReplyMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (campaign && open) {
      setName(campaign.name || "");
      setDescription(campaign.description || "");
      const vs = Array.isArray(campaign.message_variations) ? campaign.message_variations : [];
      setVariations(vs.length ? vs : [{ tone: "neutro", text: "" }]);
      setImageUrl(campaign.image_url || null);
      setDelaySeconds(campaign.delay_seconds || 60);
      setPauseBotOnReply(campaign.pause_bot_on_reply ?? true);
      setAutoReplyMessage(campaign.auto_reply_message || "");
    }
  }, [campaign?.id, open]);

  const updateVariation = (idx: number, patch: Partial<Variation>) => {
    setVariations((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const addVariation = () => {
    setVariations((prev) => [...prev, { tone: "neutro", text: "" }]);
  };

  const removeVariation = (idx: number) => {
    setVariations((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!campaign) return;
    if (!name.trim()) {
      toast.error("Informe o nome da campanha");
      return;
    }
    const cleanVariations = variations
      .map((v) => ({ tone: (v.tone || "neutro").trim(), text: (v.text || "").trim() }))
      .filter((v) => v.text.length > 0);
    if (cleanVariations.length === 0) {
      toast.error("Adicione ao menos uma variação de mensagem");
      return;
    }
    if (delaySeconds < 5 || delaySeconds > 600) {
      toast.error("Intervalo deve estar entre 5 e 600 segundos");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          message_variations: cleanVariations,
          image_url: imageUrl,
          delay_seconds: delaySeconds,
          pause_bot_on_reply: pauseBotOnReply,
          auto_reply_message: pauseBotOnReply ? (autoReplyMessage.trim() || null) : null,
        })
        .eq("id", campaign.id);

      if (error) throw error;

      toast.success("Campanha atualizada!");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const isSending = campaign?.status === "sending";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-primary" />
            </div>
            Editar campanha
          </DialogTitle>
          <DialogDescription>
            Ajuste o nome, mensagens, imagem e o intervalo de disparo.
            {isSending && (
              <span className="block mt-1 text-amber-600 font-medium">
                Esta campanha está em envio. Recomendamos pausar antes de editar.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-5">
          <div className="space-y-2">
            <Label className="text-xs">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Variações de mensagem</Label>
              <Button type="button" variant="outline" size="sm" onClick={addVariation} className="h-7">
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-3">
              {variations.map((v, i) => (
                <div key={i} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={v.tone}
                      onChange={(e) => updateVariation(i, { tone: e.target.value })}
                      placeholder="Tom (ex: profissional, amigável)"
                      className="bg-white h-8 text-xs flex-1"
                    />
                    {variations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeVariation(i)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={v.text}
                    onChange={(e) => updateVariation(i, { text: e.target.value })}
                    rows={4}
                    placeholder="Mensagem que será enviada. Use {nome} para personalizar."
                    className="bg-white text-sm"
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">{"{nome}"}</code> e{" "}
              <code className="bg-muted px-1 rounded">{"{empresa}"}</code> para personalizar.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> URL da imagem (opcional)
            </Label>
            {imageUrl ? (
              <div className="flex items-start gap-3">
                <img
                  src={imageUrl}
                  alt="Imagem da campanha"
                  className="w-24 h-24 object-cover rounded-lg border border-border"
                />
                <div className="flex-1 space-y-2">
                  <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="bg-white text-xs" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setImageUrl(null)} className="h-7">
                    <X className="w-3.5 h-3.5 mr-1" /> Remover imagem
                  </Button>
                </div>
              </div>
            ) : (
              <Input
                value=""
                onChange={(e) => setImageUrl(e.target.value || null)}
                placeholder="Cole uma URL pública ou deixe vazio"
                className="bg-white text-xs"
              />
            )}
          </div>

          <div className="space-y-2 max-w-xs">
            <Label className="text-xs">Intervalo entre envios (segundos)</Label>
            <Input
              type="number"
              min={5}
              max={600}
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 60)}
              className="bg-white"
            />
            <p className="text-[11px] text-muted-foreground">
              Recomendado: 60-120s para parecer mais humano e evitar bloqueios.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Pausar bot quando o lead responder</Label>
              <Switch checked={pauseBotOnReply} onCheckedChange={setPauseBotOnReply} />
            </div>
            {pauseBotOnReply && (
              <div className="space-y-2">
                <Label className="text-xs">Mensagem automática de resposta</Label>
                <Textarea
                  value={autoReplyMessage}
                  onChange={(e) => setAutoReplyMessage(e.target.value)}
                  rows={3}
                  className="bg-white"
                  placeholder="Mensagem enviada quando o lead responder à campanha"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-5 py-3.5 border-t bg-muted/30">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
