import {
  Megaphone, Users, ImageIcon, Send, BarChart3, Filter,
  CheckCircle, Clock, ListChecks, Zap
} from "lucide-react";
import { GuiaDialogBase, SectionCard, FeatureItem, SmartTip, type GuiaTab } from "./GuiaDialogBase";

const tabs: GuiaTab[] = [
  {
    value: "campanhas",
    label: "Campanhas",
    icon: Megaphone,
    content: (
      <>
        <SectionCard>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" /> Disparos em Massa
          </h3>
          <p className="text-xs text-muted-foreground">
            Envie mensagens personalizadas para sua base de leads via WhatsApp.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureItem icon={Send} iconColor="bg-primary/15 text-primary" title="Criação de Campanha" description="Wizard passo-a-passo: nome, mensagem, imagem e destinatários" />
            <FeatureItem icon={Zap} iconColor="bg-amber-100 text-amber-600" title="Variações de Mensagem" description="Crie múltiplas versões para evitar bloqueios do WhatsApp" />
            <FeatureItem icon={Clock} iconColor="bg-blue-100 text-blue-600" title="Agendamento" description="Programe envios para horários estratégicos" />
            <FeatureItem icon={BarChart3} iconColor="bg-emerald-100 text-emerald-600" title="Métricas" description="Acompanhe enviados, erros e taxa de sucesso em tempo real" />
          </div>
        </SectionCard>
        <SmartTip>Use pelo menos 3 variações de mensagem para reduzir o risco de bloqueio pelo WhatsApp.</SmartTip>
      </>
    ),
  },
  {
    value: "base",
    label: "Base de Leads",
    icon: Users,
    content: (
      <>
        <SectionCard>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Base de Leads
          </h3>
          <p className="text-xs text-muted-foreground">
            Gerencie sua base de contatos para campanhas e ações de marketing.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureItem icon={Users} iconColor="bg-primary/15 text-primary" title="Cadastro Manual" description="Adicione leads individualmente com nome, telefone e interesse" />
            <FeatureItem icon={ListChecks} iconColor="bg-blue-100 text-blue-600" title="Ex-clientes" description="Marque leads como ex-clientes para campanhas de reativação" />
            <FeatureItem icon={Filter} iconColor="bg-amber-100 text-amber-600" title="Segmentação" description="Filtre por mês de interesse, tipo de festa e origem" />
            <FeatureItem icon={CheckCircle} iconColor="bg-emerald-100 text-emerald-600" title="Seleção Inteligente" description="Selecione destinatários com filtros ao criar campanhas" />
          </div>
        </SectionCard>
        <SmartTip>Mantenha sua base atualizada — leads com telefones inválidos geram erros e prejudicam as métricas.</SmartTip>
      </>
    ),
  },
  {
    value: "galeria",
    label: "Galeria",
    icon: ImageIcon,
    content: (
      <>
        <SectionCard>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" /> Galeria de Imagens
          </h3>
          <p className="text-xs text-muted-foreground">
            Banco de imagens para usar nas campanhas de WhatsApp.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureItem icon={ImageIcon} iconColor="bg-primary/15 text-primary" title="Upload de Imagens" description="Envie artes, fotos e materiais promocionais" />
            <FeatureItem icon={Megaphone} iconColor="bg-emerald-100 text-emerald-600" title="Uso nas Campanhas" description="Selecione imagens da galeria ao criar uma campanha" />
          </div>
        </SectionCard>
        <SmartTip>Use imagens de alta qualidade mas com tamanho otimizado — arquivos muito grandes podem falhar no envio.</SmartTip>
      </>
    ),
  },
];

export function GuiaCampanhasDialog() {
  return (
    <GuiaDialogBase
      title="Guia de Campanhas & Marketing"
      subtitle="Disparos em massa, base de leads e galeria de imagens"
      icon={Megaphone}
      tabs={tabs}
    />
  );
}
