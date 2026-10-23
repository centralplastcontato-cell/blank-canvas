// Vídeos de "Aprenda a usar" (tabela training_lessons): categorias, cores e
// a consulta "tem vídeo publicado?" que decide se o item aparece no menu.

import { supabase } from "@/integrations/supabase/client";

export const LESSON_CATEGORIES = [
  "Primeiros passos",
  "Inteligência Artificial",
  "Atendimento",
  "Agenda e festas",
  "Operações",
  "Financeiro",
  "Configurações",
] as const;

// Nomes antigos continuam valendo para aulas que já existiam
const LEGACY: Record<string, string> = {
  Geral: "Primeiros passos",
  WhatsApp: "Atendimento",
  CRM: "Atendimento",
  Agenda: "Agenda e festas",
  "Inteligência": "Inteligência Artificial",
  "Landing Page": "Configurações",
};

export function lessonCategory(category: string | null | undefined): string {
  if (!category) return "Primeiros passos";
  return LEGACY[category] || category;
}

export const LESSON_CATEGORY_COLORS: Record<string, string> = {
  "Primeiros passos": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Inteligência Artificial": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  Atendimento: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "Agenda e festas": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "Operações": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Financeiro: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  "Configurações": "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
};

/** "4:53" a partir de segundos */
export function formatLessonDuration(seconds: number | null | undefined): string | null {
  if (!seconds || !Number.isFinite(seconds)) return null;
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export interface PublishedLessonRef {
  id: string;
  category: string | null;
}

// Uma consulta só por carregamento da página (o menu aparece em todas as telas)
let cache: Promise<PublishedLessonRef[]> | null = null;

export function fetchPublishedLessonRefs(): Promise<PublishedLessonRef[]> {
  if (!cache) {
    cache = Promise.resolve(
      supabase
        .from("training_lessons")
        .select("id, category")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
    ).then(({ data }) => (data || []) as PublishedLessonRef[], () => []);
  }
  return cache;
}

/** Primeiro vídeo publicado de uma categoria (para os botões "Ver vídeo" nas telas) */
export async function firstLessonOf(category: string): Promise<string | null> {
  const refs = await fetchPublishedLessonRefs();
  return refs.find((r) => lessonCategory(r.category) === category)?.id ?? null;
}
