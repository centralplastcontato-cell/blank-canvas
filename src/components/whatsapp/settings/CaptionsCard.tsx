import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, MessageCircle, Video, Images, Sparkles, ChevronDown } from "lucide-react";

interface Caption {
  id: string;
  caption_type: "video" | "video_promo" | "photo_collection";
  caption_text: string;
  is_active: boolean;
}

const CAPTION_TYPES = [
  { 
    value: "video", 
    label: "Vídeos", 
    icon: Video,
    description: "Legenda enviada junto com vídeos do espaço"
  },
  { 
    value: "video_promo", 
    label: "Vídeos Promocionais", 
    icon: Sparkles,
    description: "Legenda para vídeos de promoção (ex: carnaval)"
  },
  { 
    value: "photo_collection", 
    label: "Coleções de Fotos", 
    icon: Images,
    description: "Legenda enviada junto com cada foto da coleção"
  },
] as const;

export function CaptionsCard() {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [editedCaptions, setEditedCaptions] = useState<Record<string, string>>({});
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchCaptions();
  }, []);

  const fetchCaptions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("sales_material_captions")
        .select("*")
        .order("caption_type", { ascending: true });

      if (error) {
        console.error("[CaptionsCard] Error fetching captions:", error);
        return;
      }

      if (data) {
        const validTypes = ["video", "video_promo", "photo_collection"];
        const validCaptions = data.filter(c => validTypes.includes(c.caption_type)) as Caption[];
        setCaptions(validCaptions);
        const edited: Record<string, string> = {};
        validCaptions.forEach((caption) => {
          edited[caption.id] = caption.caption_text;
        });
        setEditedCaptions(edited);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCaption = async (caption: Caption) => {
    const newText = editedCaptions[caption.id];
    if (newText === caption.caption_text) {
      toast({
        title: "Sem alterações",
        description: "O texto não foi modificado.",
      });
      return;
    }

    if (!newText?.trim()) {
      toast({
        title: "Erro",
        description: "A legenda não pode estar vazia.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(caption.id);
    try {
      const { error } = await supabase
        .from("sales_material_captions")
        .update({ caption_text: newText.trim() })
        .eq("id", caption.id);

      if (error) throw error;

      setCaptions(captions.map(c => 
        c.id === caption.id ? { ...c, caption_text: newText.trim() } : c
      ));

      toast({
        title: "Sucesso",
        description: "Legenda atualizada com sucesso!",
      });
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar legenda.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(null);
    }
  };

  const getCaptionForType = (type: string): Caption | undefined => {
    return captions.find(c => c.caption_type === type);
  };

  const hasChanges = (captionId: string, originalText: string): boolean => {
    return editedCaptions[captionId] !== originalText;
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="w-5 h-5" />
                  Legendas de Materiais
                </CardTitle>
                <CardDescription>
                  Textos enviados junto com vídeos e fotos
                </CardDescription>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Variable hint */}
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="text-muted-foreground">
                    Use <code className="bg-background px-1 py-0.5 rounded">{"{unidade}"}</code> para 
                    inserir automaticamente o nome da unidade (Manchester ou Trujillo).
                  </p>
                </div>

                {CAPTION_TYPES.map(({ value, label, icon: Icon, description }) => {
                  const caption = getCaptionForType(value);
                  if (!caption) return null;

                  const currentText = editedCaptions[caption.id] || "";
                  const isModified = hasChanges(caption.id, caption.caption_text);
                  const isSavingThis = isSaving === caption.id;

                  return (
                    <div key={value} className="space-y-2 p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <Label className="text-sm font-medium">{label}</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">{description}</p>
                      
                      <Textarea
                        value={currentText}
                        onChange={(e) => setEditedCaptions({
                          ...editedCaptions,
                          [caption.id]: e.target.value
                        })}
                        placeholder="Digite a legenda..."
                        className="min-h-[80px] resize-none text-sm"
                      />

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {currentText.length} caracteres
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleSaveCaption(caption)}
                          disabled={!isModified || isSavingThis}
                        >
                          {isSavingThis ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-1" />
                          )}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
