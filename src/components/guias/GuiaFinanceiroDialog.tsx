import {
  DollarSign, TrendingUp, Wallet, Scale, Building, ArrowLeftRight,
  AlertTriangle, CheckCircle, Clock, FileText, BarChart3, CreditCard
} from "lucide-react";
import { GuiaDialogBase, SectionCard, FeatureItem, SmartTip, type GuiaTab } from "./GuiaDialogBase";

const tabs: GuiaTab[] = [
  {
    value: "receitas",
    label: "Receitas",
    icon: TrendingUp,
    content: (
      <>
        <SectionCard>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" /> Gestão de Receitas
          </h3>
          <p className="text-xs text-muted-foreground">
            Controle todas as entradas financeiras com filtros de status e visualizações por cliente.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureItem icon={Clock} iconColor="bg-amber-100 text-amber-600" title="A Receber" description="Receitas pendentes de pagamento com datas de vencimento" />
            <FeatureItem icon={AlertTriangle} iconColor="bg-red-100 text-red-600" title="Em Atraso" description="Receitas vencidas que ainda não foram confirmadas" />
            <FeatureItem icon={CheckCircle} iconColor="bg-emerald-100 text-emerald-600" title="Recebidos" description="Pagamentos já confirmados e registrados" />
            <FeatureItem icon={DollarSign} iconColor="bg-blue-100 text-blue-600" title="Visão por Cliente" description="Agrupe receitas por cliente para visão consolidada" />
          </div>
        </SectionCard>
        <SmartTip>Use o filtro "Em Atraso" diariamente para cobrar clientes com pagamentos vencidos.</SmartTip>
      </>
    ),
  },
  {
    value: "despesas",
    label: "Despesas",
    icon: Wallet,
    content: (
      <>
        <SectionCard>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Wallet className="h-4 w-4 text-red-600" /> Controle de Despesas
          </h3>
          <p className="text-xs text-muted-foreground">
            Registre despesas fixas e variáveis, categorizadas e com comprovantes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureItem icon={Wallet} iconColor="bg-red-100 text-red-600" title="Despesas Fixas" description="Aluguel, funcionários, manutenção e outros custos recorrentes" />
            <FeatureItem icon={DollarSign} iconColor="bg-amber-100 text-amber-600" title="Despesas Variáveis" description="Compras de materiais, decoração e gastos por evento" />
            <FeatureItem icon={FileText} iconColor="bg-blue-100 text-blue-600" title="Comprovantes" description="Anexe boletos e comprovantes de pagamento" />
            <FeatureItem icon={CheckCircle} iconColor="bg-emerald-100 text-emerald-600" title="Marcar como Pago" description="Atualize o status e registre a data do pagamento" />
          </div>
        </SectionCard>
        <SmartTip>Categorize suas despesas corretamente para ter relatórios financeiros mais precisos.</SmartTip>
      </>
    ),
  },
  {
    value: "contas",
    label: "Contas",
    icon: Building,
    content: (
      <>
        <SectionCard>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Building className="h-4 w-4 text-primary" /> Contas Bancárias
          </h3>
          <p className="text-xs text-muted-foreground">
            Gerencie múltiplas contas bancárias e acompanhe saldos em tempo real.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureItem icon={Building} iconColor="bg-primary/15 text-primary" title="Múltiplas Contas" description="Cadastre contas correntes, poupança e caixa" />
            <FeatureItem icon={Scale} iconColor="bg-emerald-100 text-emerald-600" title="Saldo Atualizado" description="Saldo calculado automaticamente com entradas e saídas" />
            <FeatureItem icon={ArrowLeftRight} iconColor="bg-blue-100 text-blue-600" title="Transferências" description="Transfira entre contas mantendo o controle total" />
            <FeatureItem icon={BarChart3} iconColor="bg-amber-100 text-amber-600" title="Extrato" description="Visualize o extrato detalhado de cada conta" />
          </div>
        </SectionCard>
        <SmartTip>Defina uma conta padrão para que novas receitas e despesas sejam vinculadas automaticamente.</SmartTip>
      </>
    ),
  },
  {
    value: "taxas",
    label: "Taxas",
    icon: CreditCard,
    content: (
      <>
        <SectionCard>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Taxas de Cartão
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure taxas por operadora para calcular o valor líquido de vendas no cartão.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureItem icon={CreditCard} iconColor="bg-primary/15 text-primary" title="Operadoras" description="Cadastre múltiplas operadoras com taxas por parcela" />
            <FeatureItem icon={DollarSign} iconColor="bg-emerald-100 text-emerald-600" title="Cálculo Líquido" description="Veja quanto você recebe após descontar taxas" />
          </div>
        </SectionCard>
        <SmartTip>Mantenha as taxas atualizadas — operadoras costumam alterar valores em negociações periódicas.</SmartTip>
      </>
    ),
  },
  {
    value: "relatorios",
    label: "Relatórios",
    icon: FileText,
    content: (
      <>
        <SectionCard>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Relatórios Financeiros
          </h3>
          <p className="text-xs text-muted-foreground">
            Exporte dados financeiros em PDF e Excel para análise detalhada.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureItem icon={BarChart3} iconColor="bg-primary/15 text-primary" title="DRE Simplificado" description="Demonstrativo de resultado com receitas, despesas e lucro" />
            <FeatureItem icon={TrendingUp} iconColor="bg-emerald-100 text-emerald-600" title="Fluxo de Caixa" description="Entradas e saídas por período com gráficos" />
            <FeatureItem icon={FileText} iconColor="bg-blue-100 text-blue-600" title="Exportação" description="Gere relatórios em PDF e Excel filtrados por período" />
            <FeatureItem icon={Scale} iconColor="bg-amber-100 text-amber-600" title="Festas Fechadas" description="Relatório consolidado de vendas por período e unidade" />
          </div>
        </SectionCard>
        <SmartTip>Gere o DRE mensal para acompanhar a saúde financeira do negócio e identificar onde cortar custos.</SmartTip>
      </>
    ),
  },
];

export function GuiaFinanceiroDialog() {
  return (
    <GuiaDialogBase
      title="Guia do Painel Financeiro"
      subtitle="Receitas, despesas, contas bancárias e relatórios"
      icon={DollarSign}
      tabs={tabs}
    />
  );
}
