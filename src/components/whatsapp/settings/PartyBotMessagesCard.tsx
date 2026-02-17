import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Loader2, Save, RotateCcw, PartyPopper } from "lucide-react";

export const DEFAULT_PARTY_BOT_MESSAGES = [
  "Olá, {name}! 👋\n\nQue bom que você se interessou pelos nossos pacotes durante a festa no {company}!\n\nVou te enviar algumas opções especiais. 🎉",
  "Oi {name}! 👋\n\nVi que você curtiu nosso espaço durante a festa no {company}. Tenho novidades incríveis pra te mostrar! 🎉",
  "E aí, {name}! 👋\n\nQue legal que você demonstrou interesse no {company}! Deixa eu te mostrar uns pacotes especiais 🎉",
  "{name}, tudo bem? 👋\n\nSoube que você gostou do nosso espaço no {company}! Vou compartilhar umas opções com você 🎉",
  "Olá {name}! 👋\n\nFico feliz que tenha se interessado pelo {company}! Preparei algumas opções especiais pra você 🎉",
  "Oi {name}, aqui é do {company}! 👋\n\nVi que você quer conhecer nossos pacotes. Vou te enviar tudo! 🎉",
  "{name}, que bom ter você por aqui! 👋\n\nVou te mostrar as opções do {company} que preparamos 🎉",
  "Olá {name}! 👋\n\nDo {company} aqui. Soube do seu interesse e quero te apresentar nossos pacotes! 🎉",
  "Oi {name}! 👋\n\nVocê demonstrou interesse durante a festa no {company}, né? Tenho opções incríveis! 🎉",
  "{name}, prazer! 👋\n\nAqui é do {company}. Vi que você quer saber mais sobre nossos pacotes. Vamos lá! 🎉",
];

export function PartyBotMessagesCard() {
  const { currentCompanyId, currentCompany } = useCompany();
  const [messages, setMessages] = useState<string[]>([...DEFAULT_PARTY_BOT_MESSAGES]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentCompanyId) return;
    loadMessages();
  }, [currentCompanyId]);

  const loadMessages = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", currentCompanyId!)
      .single();

    const settings = data?.settings as Record<string, any> | null;
    if (settings?.party_bot_messages && Array.isArray(settings.party_bot_messages)) {
      setMessages(settings.party_bot_messages);
    } else {
      setMessages([...DEFAULT_PARTY_BOT_MESSAGES]);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!currentCompanyId) return;
    setIsSaving(true);

    const { data: current } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", currentCompanyId)
      .single();

    const existingSettings = (current?.settings as Record<string, any>) || {};

    const { error } = await supabase
      .from("companies")
      .update({
        settings: { ...existingSettings, party_bot_messages: messages },
      })
      .eq("id", currentCompanyId);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mensagens salvas!", description: "As mensagens do bot de festa foram atualizadas." });
    }
    setIsSaving(false);
  };

  const handleReset = () => {
    setMessages([...DEFAULT_PARTY_BOT_MESSAGES]);
    toast({ title: "Mensagens restauradas", description: "Salve para aplicar as mensagens padrão." });
  };

  const updateMessage = (index: number, value: string) => {
    const updated = [...messages];
    updated[index] = value;
    setMessages(updated);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PartyPopper className="w-5 h-5" />
          Mensagens do Bot de Festa
        </CardTitle>
        <CardDescription>
          Mensagens enviadas automaticamente para convidados que demonstraram interesse durante festas.
          Use <Badge variant="secondary" className="text-xs mx-1">{"{name}"}</Badge> para o nome e
          <Badge variant="secondary" className="text-xs mx-1">{"{company}"}</Badge> para o nome do buffet.
          As mensagens rotacionam automaticamente para proteger contra bloqueio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mensagem {i + 1}</Label>
            <Textarea
              value={msg}
              onChange={(e) => updateMessage(i, e.target.value)}
              rows={3}
              className="text-sm resize-none"
              placeholder={`Mensagem ${i + 1}...`}
            />
          </div>
        ))}

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Mensagens
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
