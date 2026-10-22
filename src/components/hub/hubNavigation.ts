import {
  Activity, BarChart3, BookOpen, Brain, Building2, Contact, Database, GraduationCap,
  Headset, Instagram, Package, Presentation, Smartphone, Target, UserCog, UserSearch, Rocket,
  type LucideIcon,
} from "lucide-react";

export type HubPage =
  | "hub" | "empresas" | "users" | "whatsapp" | "onboarding" | "prospeccao" | "comercial-b2b"
  | "consumo-ia" | "treinamento" | "leads" | "suporte" | "materiais" | "recrutamento"
  | "funcionalidades" | "backups" | "instagram" | "message-trace";

export interface HubNavItem {
  id: HubPage;
  label: string;
  path: string;
  icon: LucideIcon;
  /** Cor da bolinha do ícone (mesmo padrão do menu da plataforma) */
  color: string;
  /** Palavras extras para a busca rápida */
  keywords?: string[];
  /** Fora do menu lateral; só aparece na busca rápida */
  hidden?: boolean;
}

export interface HubNavGroup {
  label: string;
  items: HubNavItem[];
}

// Fonte única do menu do Hub (menu lateral, menu do celular e busca rápida)
export const hubNavGroups: HubNavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { id: "hub", label: "Painel", path: "/hub", icon: BarChart3, color: "bg-blue-500/15 text-blue-600", keywords: ["dashboard", "inicio", "métricas"] },
    ],
  },
  {
    label: "Comercial",
    items: [
      { id: "leads", label: "Leads", path: "/hub/leads", icon: Contact, color: "bg-violet-500/15 text-violet-600", keywords: ["clientes", "contatos"] },
      { id: "empresas", label: "Empresas", path: "/hub/empresas", icon: Building2, color: "bg-slate-500/15 text-slate-600", keywords: ["unidades", "buffets"] },
      { id: "comercial-b2b", label: "Comercial B2B", path: "/hub/comercial-b2b", icon: Presentation, color: "bg-amber-500/15 text-amber-600", keywords: ["vendas", "funil"] },
      { id: "prospeccao", label: "Prospecção", path: "/hub/prospeccao", icon: Target, color: "bg-rose-500/15 text-rose-600", keywords: ["prospects"] },
    ],
  },
  {
    label: "Canais",
    items: [
      { id: "whatsapp", label: "WhatsApp", path: "/hub/whatsapp", icon: Smartphone, color: "bg-green-500/15 text-green-700", keywords: ["instância", "conexão"] },
      { id: "instagram", label: "Instagram", path: "/hub/instagram", icon: Instagram, color: "bg-pink-500/15 text-pink-600" },
      { id: "message-trace", label: "Diagnóstico Msg", path: "/admin/message-trace", icon: Activity, color: "bg-cyan-500/15 text-cyan-700", keywords: ["diagnóstico de mensagens", "trace", "debug", "erro"] },
    ],
  },
  {
    label: "Equipe e conteúdo",
    items: [
      { id: "treinamento", label: "Treinamento", path: "/hub/treinamento", icon: GraduationCap, color: "bg-indigo-500/15 text-indigo-600", keywords: ["aulas", "cursos"] },
      { id: "materiais", label: "Materiais", path: "/hub/materiais", icon: Package, color: "bg-emerald-500/15 text-emerald-600", keywords: ["arquivos", "vendas"] },
      { id: "recrutamento", label: "Recrutamento", path: "/hub/recrutamento", icon: UserSearch, color: "bg-orange-500/15 text-orange-600", keywords: ["vagas", "candidatos"] },
    ],
  },
  {
    label: "Sistema",
    items: [
      { id: "consumo-ia", label: "Consumo de IA", path: "/hub/consumo-ia", icon: Brain, color: "bg-purple-500/15 text-purple-600", keywords: ["custo", "tokens", "openai"] },
      { id: "backups", label: "Backups", path: "/hub/backups", icon: Database, color: "bg-sky-500/15 text-sky-600" },
      { id: "funcionalidades", label: "Funcionalidades", path: "/hub/funcionalidades", icon: BookOpen, color: "bg-teal-500/15 text-teal-600", keywords: ["recursos", "documentação"] },
      { id: "suporte", label: "Suporte", path: "/hub/suporte", icon: Headset, color: "bg-red-500/15 text-red-600", keywords: ["ajuda", "chamados"] },
      { id: "users", label: "Usuários", path: "/hub/users", icon: UserCog, color: "bg-slate-500/15 text-slate-600", keywords: ["acessos", "permissões"], hidden: true },
      { id: "onboarding", label: "Onboarding", path: "/hub/onboarding", icon: Rocket, color: "bg-fuchsia-500/15 text-fuchsia-600", keywords: ["implantação"], hidden: true },
    ],
  },
];

export const hubNavItems: HubNavItem[] = hubNavGroups.flatMap((g) => g.items);
