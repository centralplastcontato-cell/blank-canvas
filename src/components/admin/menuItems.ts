// Itens do menu lateral, iguais no celular (MobileMenu) e no computador/tablet
// (AdminSidebar): mesmos nomes, grupos, cores e números de pendências.

import { useEffect, useState } from "react";
import {
  Headset,
  Settings,
  Building2,
  Brain,
  CalendarDays,
  FolderOpen,
  Megaphone,
  FileSignature,
  DollarSign,
  Handshake,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { useMenuBadges } from "@/hooks/useMenuBadges";

export interface MenuItem {
  id: string;
  group: "atendimento" | "festas" | "mais";
  label: string;
  icon: LucideIcon;
  /** cor do círculo do ícone */
  color: string;
  path: string;
  show: boolean;
  badge?: number;
  badgeTone?: "alert" | "info";
}

export const MENU_GROUPS: Array<{ id: MenuItem["group"]; label: string }> = [
  { id: "atendimento", label: "Atendimento" },
  { id: "festas", label: "Festas" },
  { id: "mais", label: "Mais" },
];

const ROLE_LABELS: Record<string, string> = { owner: "Dono", admin: "Administrador", member: "Equipe" };

export function roleLabel(role: string | null, isAdmin?: boolean): string {
  if (role && ROLE_LABELS[role]) return ROLE_LABELS[role];
  return isAdmin ? "Administrador" : "Equipe";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Texto do número no menu (99+ quando passa de 99) */
export function badgeText(n: number): string {
  return n > 99 ? "99+" : String(n);
}

interface Options {
  isAdmin?: boolean;
  canViewFinanceiro?: boolean;
  /** busca os números de pendências (só quando o menu está à vista) */
  badgesEnabled: boolean;
}

/** Itens visíveis do menu, já com os números de pendências */
export function useMenuItems({ isAdmin, canViewFinanceiro, badgesEnabled }: Options): {
  items: MenuItem[];
  /** nome de quem está logado (do cadastro), para quando a página não manda */
  authName: string;
} {
  const modules = useCompanyModules();
  const [finViewAllowed, setFinViewAllowed] = useState(true);
  const [authName, setAuthName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      const meta = (data.user.user_metadata || {}) as { full_name?: string; name?: string };
      setAuthName(meta.full_name || meta.name || data.user.email || "");
      supabase
        .from("user_permissions")
        .select("granted")
        .eq("user_id", data.user.id)
        .eq("permission", "financial.view")
        .maybeSingle()
        .then(({ data: perm }) => {
          if (perm && perm.granted === false) setFinViewAllowed(false);
        });
    });
  }, []);

  const showFinanceiro = canViewFinanceiro !== false && finViewAllowed;
  const badges = useMenuBadges(badgesEnabled, !!modules.inteligencia);

  const all: MenuItem[] = [
    { id: "atendimento", group: "atendimento", label: "Central de Atendimento", icon: Headset, color: "bg-blue-500/15 text-blue-600", path: "/atendimento", show: !!modules.central_atendimento, badge: badges.unread, badgeTone: "alert" },
    { id: "inteligencia", group: "atendimento", label: "Inteligência", icon: Brain, color: "bg-violet-500/15 text-violet-600", path: "/inteligencia", show: !!modules.inteligencia, badge: badges.waiting, badgeTone: "alert" },
    { id: "campanhas", group: "atendimento", label: "Campanhas", icon: Megaphone, color: "bg-pink-500/15 text-pink-600", path: "/campanhas", show: !!modules.campanhas },
    { id: "agenda", group: "festas", label: "Central de Agenda", icon: CalendarDays, color: "bg-emerald-500/15 text-emerald-600", path: "/agenda", show: !!modules.agenda, badge: badges.visitsToday, badgeTone: "info" },
    { id: "formularios", group: "festas", label: "Operações", icon: FolderOpen, color: "bg-amber-500/15 text-amber-600", path: "/formularios", show: !!modules.operacoes },
    { id: "contratos", group: "festas", label: "Contratos", icon: FileSignature, color: "bg-sky-500/15 text-sky-600", path: "/contratos", show: !!modules.contrato },
    { id: "financeiro", group: "festas", label: "Financeiro", icon: DollarSign, color: "bg-green-500/15 text-green-700", path: "/financeiro", show: showFinanceiro },
    { id: "configuracoes", group: "mais", label: "Configurações Gerais", icon: Settings, color: "bg-slate-500/15 text-slate-600", path: "/configuracoes", show: !!modules.config },
    { id: "empresas", group: "mais", label: "Empresas", icon: Building2, color: "bg-slate-500/15 text-slate-600", path: "/hub/empresas", show: !!isAdmin },
    // Treinamento escondido (out/2026): nenhuma aula cadastrada
    { id: "parceiro", group: "mais", label: "Empresa Parceira", icon: Handshake, color: "bg-orange-500/15 text-orange-600", path: "/parceiro", show: !!modules.empresa_parceira },
  ];

  return { items: all.filter((i) => i.show), authName };
}
