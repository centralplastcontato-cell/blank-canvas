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
      { id: "hub", label: "Painel", path: "/hub", icon: BarChart3, keywords: ["dashboard", "inicio", "métricas"] },
    ],
  },
  {
    label: "Comercial",
    items: [
      { id: "leads", label: "Leads", path: "/hub/leads", icon: Contact, keywords: ["clientes", "contatos"] },
      { id: "empresas", label: "Empresas", path: "/hub/empresas", icon: Building2, keywords: ["unidades", "buffets"] },
      { id: "comercial-b2b", label: "Comercial B2B", path: "/hub/comercial-b2b", icon: Presentation, keywords: ["vendas", "funil"] },
      { id: "prospeccao", label: "Prospecção", path: "/hub/prospeccao", icon: Target, keywords: ["prospects"] },
    ],
  },
  {
    label: "Canais",
    items: [
      { id: "whatsapp", label: "WhatsApp", path: "/hub/whatsapp", icon: Smartphone, keywords: ["instância", "conexão"] },
      { id: "instagram", label: "Instagram", path: "/hub/instagram", icon: Instagram },
      { id: "message-trace", label: "Diagnóstico de mensagens", path: "/admin/message-trace", icon: Activity, keywords: ["trace", "debug", "erro"] },
    ],
  },
  {
    label: "Equipe e conteúdo",
    items: [
      { id: "treinamento", label: "Treinamento", path: "/hub/treinamento", icon: GraduationCap, keywords: ["aulas", "cursos"] },
      { id: "materiais", label: "Materiais", path: "/hub/materiais", icon: Package, keywords: ["arquivos", "vendas"] },
      { id: "recrutamento", label: "Recrutamento", path: "/hub/recrutamento", icon: UserSearch, keywords: ["vagas", "candidatos"] },
    ],
  },
  {
    label: "Sistema",
    items: [
      { id: "consumo-ia", label: "Consumo de IA", path: "/hub/consumo-ia", icon: Brain, keywords: ["custo", "tokens", "openai"] },
      { id: "backups", label: "Backups", path: "/hub/backups", icon: Database },
      { id: "funcionalidades", label: "Funcionalidades", path: "/hub/funcionalidades", icon: BookOpen, keywords: ["recursos", "documentação"] },
      { id: "suporte", label: "Suporte", path: "/hub/suporte", icon: Headset, keywords: ["ajuda", "chamados"] },
      { id: "users", label: "Usuários", path: "/hub/users", icon: UserCog, keywords: ["acessos", "permissões"], hidden: true },
      { id: "onboarding", label: "Onboarding", path: "/hub/onboarding", icon: Rocket, keywords: ["implantação"], hidden: true },
    ],
  },
];

export const hubNavItems: HubNavItem[] = hubNavGroups.flatMap((g) => g.items);
