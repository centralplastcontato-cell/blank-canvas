import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Info, Link2, Star, Bot, Check, CheckCheck, Clock, 
  AlertCircle, Bell, BellOff, Trash2,
  ChevronLeft, ChevronRight, ExternalLink,
  ArrowRightLeft, GripVertical
} from "lucide-react";

interface GuideItem {
  icon: React.ReactNode;
  label: string;
  description: string;
}

interface GuideSection {
  title: string;
  items: GuideItem[];
}

export function VisualGuideSection() {
  const guideSections: GuideSection[] = [
    {
      title: "Ícones de Status do Lead",
      items: [
        {
          icon: <Info className="w-4 h-4 text-primary" />,
          label: "Lead Vinculado (Azul)",
          description: "O contato está vinculado a um lead no CRM. Clique para ver os detalhes completos."
        },
        {
          icon: <Info className="w-4 h-4 text-destructive" />,
          label: "Não Qualificado (Vermelho)",
          description: "O contato ainda não foi qualificado como lead. Clique para criar/qualificar."
        },
        {
          icon: <Link2 className="w-4 h-4 text-primary" />,
          label: "Vinculação (Corrente)",
          description: "Aparece na lista de conversas indicando que o contato tem um lead associado."
        },
        {
          icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
          label: "Lead Incompleto",
          description: "Aparece no Kanban quando faltam dados importantes (unidade, data ou convidados)."
        },
      ]
    },
    {
      title: "Status de Mensagens",
      items: [
        {
          icon: <Clock className="w-3 h-3 text-muted-foreground" />,
          label: "Pendente",
          description: "A mensagem está sendo enviada."
        },
        {
          icon: <Check className="w-3 h-3 text-muted-foreground" />,
          label: "Enviada",
          description: "A mensagem foi enviada ao servidor do WhatsApp."
        },
        {
          icon: <CheckCheck className="w-3 h-3 text-muted-foreground" />,
          label: "Entregue",
          description: "A mensagem foi entregue ao dispositivo do destinatário."
        },
        {
          icon: <CheckCheck className="w-3 h-3 text-primary" />,
          label: "Lida",
          description: "A mensagem foi visualizada pelo destinatário."
        },
      ]
    },
    {
      title: "Conversas e Contatos",
      items: [
        {
          icon: <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />,
          label: "Favorito",
          description: "Conversa marcada como favorita para acesso rápido."
        },
        {
          icon: <Bot className="w-4 h-4 text-primary" />,
          label: "Bot Ativo",
          description: "O chatbot automático está respondendo esta conversa."
        },
        {
          icon: <Bot className="w-4 h-4 text-muted-foreground" />,
          label: "Bot Desativado",
          description: "O chatbot foi desativado para esta conversa específica."
        },
        {
          icon: <Badge variant="secondary" className="text-[10px] h-4 px-1">3</Badge>,
          label: "Contador de Não Lidas",
          description: "Número de mensagens não lidas na conversa."
        },
      ]
    },
    {
      title: "Notificações",
      items: [
        {
          icon: <Bell className="w-4 h-4 text-primary" />,
          label: "Notificações Ativas",
          description: "Você receberá alertas sonoros quando novas mensagens chegarem."
        },
        {
          icon: <BellOff className="w-4 h-4 text-muted-foreground" />,
          label: "Notificações Silenciadas",
          description: "Os alertas sonoros estão desativados."
        },
      ]
    },
    {
      title: "Ações do Kanban",
      items: [
        {
          icon: <GripVertical className="w-4 h-4 text-muted-foreground" />,
          label: "Arrastar Card",
          description: "Segure e arraste para mover o lead entre colunas."
        },
        {
          icon: <div className="flex gap-0.5"><ChevronLeft className="w-4 h-4" /><ChevronRight className="w-4 h-4" /></div>,
          label: "Mover Status",
          description: "Botões rápidos para avançar ou retroceder o status do lead."
        },
        {
          icon: <ExternalLink className="w-4 h-4 text-muted-foreground" />,
          label: "Abrir WhatsApp",
          description: "Abre uma conversa direta com o lead no WhatsApp."
        },
        {
          icon: <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />,
          label: "Transferir Lead",
          description: "Transfere o lead para outro responsável."
        },
        {
          icon: <Trash2 className="w-4 h-4 text-destructive" />,
          label: "Excluir Lead",
          description: "Remove permanentemente o lead do sistema (apenas admins)."
        },
      ]
    },
    {
      title: "Indicadores de Unidade",
      items: [
        {
          icon: <div className="w-3 h-3 rounded-full bg-blue-500" />,
          label: "Manchester",
          description: "Lead ou instância associada à unidade Manchester."
        },
        {
          icon: <div className="w-3 h-3 rounded-full bg-amber-500" />,
          label: "Trujillo",
          description: "Lead ou instância associada à unidade Trujillo."
        },
        {
          icon: <Badge variant="outline" className="text-[10px] h-4 px-1">Todas</Badge>,
          label: "Todas as Unidades",
          description: "Visualização consolidada com leads de todas as unidades."
        },
      ]
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Guia de Ícones e Indicadores</CardTitle>
          <CardDescription>
            Referência rápida para entender os elementos visuais do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {guideSections.map((section, sectionIndex) => (
            <div key={section.title}>
              {sectionIndex > 0 && <Separator className="mb-4" />}
              <h3 className="font-medium text-sm mb-3 text-foreground">{section.title}</h3>
              <div className="grid gap-3">
                {section.items.map((item, itemIndex) => (
                  <div 
                    key={itemIndex}
                    className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-background shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
