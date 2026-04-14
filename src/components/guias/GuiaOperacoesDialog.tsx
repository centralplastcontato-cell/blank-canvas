import { FolderOpen, Package, FileText, ClipboardCheck, Users, CreditCard, Store, PartyPopper, Sparkles } from "lucide-react";
import { GuiaDialogBase, SectionCard, FeatureItem, SmartTip } from "./GuiaDialogBase";
import type { GuiaTab } from "./GuiaDialogBase";

const tabs: GuiaTab[] = [
  {
    value: "pacotes",
    label: "Pacotes",
    icon: Package,
    content: (
      <div className="space-y-4">
        <SectionCard>
          <h3 className="font-semibold flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Pacotes de Festa</h3>
          <p className="text-sm text-muted-foreground">Configure os pacotes oferecidos pelo buffet com valores, descrições e opções de precificação por pessoa.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <FeatureItem icon={Package} iconColor="text-primary" title="Pacotes Padrão" description="Valor fixo por pacote completo" />
            <FeatureItem icon={Users} iconColor="text-emerald-500" title="Preço por Pessoa" description="Valor separado por adulto e criança" />
          </div>
        </SectionCard>
        <SmartTip>Pacotes com "preço separado" calculam automaticamente o valor total no formulário de eventos.</SmartTip>
      </div>
    ),
  },
  {
    value: "formularios",
    label: "Formulários",
    icon: FileText,
    content: (
      <div className="space-y-4">
        <SectionCard>
          <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Formulários do Sistema</h3>
          <p className="text-sm text-muted-foreground">Crie e gerencie templates de formulários que são enviados automaticamente ou manualmente aos clientes.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <FeatureItem icon={FileText} iconColor="text-blue-500" title="Avaliação Pós-Festa" description="Pesquisa de satisfação enviada após o evento" />
            <FeatureItem icon={FileText} iconColor="text-amber-500" title="Pré-Festa" description="Coleta de informações antes do evento" />
            <FeatureItem icon={FileText} iconColor="text-purple-500" title="Contrato" description="Dados para preenchimento do contrato" />
            <FeatureItem icon={FileText} iconColor="text-emerald-500" title="Cardápio" description="Seleção de itens do cardápio pelo cliente" />
          </div>
        </SectionCard>
        <SmartTip>Os formulários podem ser enviados manualmente pela Agenda ou automaticamente via Automações nas Configurações.</SmartTip>
      </div>
    ),
  },
  {
    value: "checklist",
    label: "Checklist",
    icon: ClipboardCheck,
    content: (
      <div className="space-y-4">
        <SectionCard>
          <h3 className="font-semibold flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" /> Templates de Checklist</h3>
          <p className="text-sm text-muted-foreground">Modelos de checklist aplicados a cada evento para garantir que todos os preparativos sejam feitos.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <FeatureItem icon={ClipboardCheck} iconColor="text-primary" title="Templates Reutilizáveis" description="Crie modelos e aplique em qualquer evento" />
            <FeatureItem icon={PartyPopper} iconColor="text-amber-500" title="Acompanhamento" description="Marque itens como concluídos em tempo real" />
          </div>
        </SectionCard>
      </div>
    ),
  },
  {
    value: "freelancer",
    label: "Freelancer",
    icon: Users,
    content: (
      <div className="space-y-4">
        <SectionCard>
          <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Gestão de Freelancers</h3>
          <p className="text-sm text-muted-foreground">Cadastre e gerencie monitores, garçons e outros freelancers que trabalham nos eventos.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <FeatureItem icon={Users} iconColor="text-primary" title="Formulário de Cadastro" description="Link público para freelancers se cadastrarem" />
            <FeatureItem icon={Sparkles} iconColor="text-amber-500" title="Avaliações" description="Avalie o desempenho após cada evento" />
          </div>
        </SectionCard>
      </div>
    ),
  },
  {
    value: "financeiro",
    label: "Taxas/Contas",
    icon: CreditCard,
    content: (
      <div className="space-y-4">
        <SectionCard>
          <h3 className="font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Taxas de Cartão</h3>
          <p className="text-sm text-muted-foreground">Configure as taxas das operadoras para cálculo automático do valor líquido nos recebimentos via cartão.</p>
        </SectionCard>
        <SectionCard>
          <h3 className="font-semibold flex items-center gap-2"><Store className="h-4 w-4 text-emerald-500" /> Contas Bancárias</h3>
          <p className="text-sm text-muted-foreground">Cadastre contas bancárias para vincular a receitas e despesas, permitindo extrato por conta.</p>
        </SectionCard>
        <SmartTip>As taxas de cartão são usadas automaticamente ao registrar pagamentos via cartão no módulo Financeiro.</SmartTip>
      </div>
    ),
  },
];

export function GuiaOperacoesDialog() {
  return (
    <GuiaDialogBase
      title="Guia de Operações"
      subtitle="Entenda cada recurso de gestão operacional"
      icon={FolderOpen}
      tabs={tabs}
      defaultTab="pacotes"
    />
  );
}
