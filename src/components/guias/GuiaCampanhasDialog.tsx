import {
  Megaphone, Users, ImageIcon, Send, BarChart3, Filter,
  CheckCircle, Clock, ListChecks, Zap, ShieldCheck, UserX
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
            <FeatureItem icon={Send} iconColor="bg-primary/15 text-primary" title="Criação em 3 passos" description="Mensagem, público e revisão. Se fechar sem querer, o rascunho fica guardado" />
            <FeatureItem icon={Zap} iconColor="bg-amber-100 text-amber-600" title="Várias mensagens" description="A IA escreve 5 versões e você pode escrever as suas; cada pessoa recebe uma delas" />
            <FeatureItem icon={Clock} iconColor="bg-blue-100 text-blue-600" title="Sai sozinha" description="Até 30 por dia, de segunda a sábado das 9h às 19h, uma a cada ~20 min. Pode fechar a tela" />
            <FeatureItem icon={BarChart3} iconColor="bg-emerald-100 text-emerald-600" title="Resultado" description="Quantos responderam em até 3 dias e quantos fecharam festa em até 45 dias" />
            <FeatureItem icon={ShieldCheck} iconColor="bg-violet-100 text-violet-600" title="Público protegido" description="Ficam de fora quem já fechou, quem recebeu campanha há menos de 15 dias e números repetidos" />
            <FeatureItem icon={UserX} iconColor="bg-rose-100 text-rose-600" title="Pediram para sair" description="Quem responde “sair” ou “parar” não recebe mais; dá para tirar da lista se a pessoa pedir" />
          </div>
        </SectionCard>
        <SmartTip>Mensagens curtas e pessoais, com o nome do cliente ({"{nome}"}), costumam ter mais respostas. Use o Resultado para ver qual campanha funcionou melhor.</SmartTip>
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
