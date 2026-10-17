/**
 * Passo a passo do buffet que se cadastrou sozinho (/setup): as respostas da IA,
 * as datas ocupadas e os dias da agenda rápida.
 */
import { BUFFET_FIELDS } from "@/lib/aiBuffetFields";

/** Marca das datas ocupadas criadas no cadastro (só essas podem ser desmarcadas no passo a passo) */
export const BUSY_NOTE = "Marcado no cadastro";

/** Segunda primeiro — o mesmo índice de serializeVisitHours (0 = segunda … 6 = domingo) */
export const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export interface Slot {
  start: string;
  end: string;
}

export interface SetupAnswers {
  assistant_name: string;
  slots: Slot[];
  visit_days: number[];
  visit_start: string;
  visit_end: string;
  team_days: number[];
  team_start: string;
  team_end: string;
  /** Sábado em horário diferente dos dias de semana */
  visit_sat_diff?: boolean;
  visit_sat_start?: string;
  visit_sat_end?: string;
  team_sat_diff?: boolean;
  team_sat_start?: string;
  team_sat_end?: string;
  duracao: string;
  estrutura: string;
  diferenciais: string;
  comida_externa: string;
  monitores: string;
  regras: string;
  proibido: string;
}

/** Perguntas de resposta pronta (mesmas opções do Configurar IA) */
export const SETUP_SELECTS = (["comida_externa", "monitores"] as const).map((key) => {
  const f = BUFFET_FIELDS.find((x) => x.key === key)!;
  return { key, label: f.label, options: f.options || [] };
});

/** [{13:00,17:00},{19:00,23:00}] → "13:00-17:00, 19:00-23:00" (formato de party_slots) */
export function buildPartySlots(slots: Slot[]): string {
  return slots.filter((s) => s.start && s.end).map((s) => `${s.start}-${s.end}`).join(", ");
}

/** AAAA-MM-DD no horário local */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface MonthGrid {
  key: string;
  label: string;
  /** Casas vazias antes do dia 1 (semana começando na segunda) */
  offset: number;
  days: string[];
}

/** Os próximos N meses, a partir do mês de hoje */
export function monthsAhead(from: Date, count: number): MonthGrid[] {
  const out: MonthGrid[] = [];
  for (let i = 0; i < count; i++) {
    const first = new Date(from.getFullYear(), from.getMonth() + i, 1);
    const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    out.push({
      key: dayKey(first).slice(0, 7),
      label: first.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      offset: (first.getDay() + 6) % 7,
      days: Array.from({ length: total }, (_, d) => dayKey(new Date(first.getFullYear(), first.getMonth(), d + 1))),
    });
  }
  return out;
}

/** Status do cadastro automático guardado em companies.settings.signup */
export type SignupStatus = "cadastro" | "aguardando_aprovacao" | "aprovado";

export function signupStatus(settings: unknown): SignupStatus | null {
  const s = (settings as { signup?: { status?: string } } | null)?.signup?.status;
  return s === "cadastro" || s === "aguardando_aprovacao" || s === "aprovado" ? s : null;
}

/** Índice do sábado em WEEKDAYS */
export const SATURDAY = 5;

/** Sugestões para tocar e ir adicionando nas perguntas abertas do cadastro */
export const SETUP_SUGGESTIONS = {
  estrutura: [
    "Salão climatizado", "Brinquedão", "Cama elástica", "Piscina de bolinhas", "Escorregador", "Pula-pula",
    "Tobogã", "Parede de escalada", "Casinha de bonecas", "Carrinhos / kart elétrico", "Futebol de sabão",
    "Quadra / campo de futebol", "Piscina", "Arena de games", "Videogame / realidade virtual", "Fliperama",
    "Mesa de pebolim / air hockey", "Cinema / telão", "Palco com karaokê", "Pista de dança com iluminação",
    "Área baby", "Fraldário", "Espaço para os pais", "Área externa / jardim", "Parquinho",
    "Cozinha própria", "Mesas e cadeiras para os convidados", "Som e iluminação", "Gerador de energia",
    "Wi-Fi para os convidados", "Estacionamento", "Acessível para cadeirantes",
  ],
  diferenciais: [
    "Monitores o tempo todo", "Cardápio completo", "Comida feita na hora", "Bolo e doces inclusos",
    "Opções para alergia e restrições alimentares", "Bebidas à vontade", "Decoração inclusa",
    "Vários temas de decoração", "Animação e recreação", "Personagens vivos", "Pintura de rosto",
    "Fotos e vídeo da festa", "Lembrancinhas", "Convite digital", "Uma festa por vez (espaço exclusivo)",
    "Festa no período da manhã, tarde ou noite", "Estacionamento próprio", "Equipe experiente",
    "Controle de entrada e segurança", "Ambiente limpo e higienizado", "Atendimento personalizado",
    "Parcelamento facilitado", "Fácil de chegar", "Ótimas avaliações dos clientes",
  ],
  regras: [
    "Visita só com hora marcada", "Não fazemos festa fora do buffet", "Crianças sempre com um adulto responsável",
    "Proibido fumar no espaço", "Decoração do tema é por conta da família", "Sem bebida alcoólica para menores",
    "Horário de término respeitado", "Não é permitido entrar com animais", "Não é permitido levar comida de fora",
    "Lista de convidados enviada antes da festa", "Uso de meia nos brinquedos", "Sem fogos ou velas faísca",
    "Danos ao espaço são cobrados", "Reserva da data só com contrato e sinal",
  ],
  proibido: [
    "Dar desconto", "Garantir data sem contrato", "Prometer brinde", "Prometer item fora do pacote",
    "Falar mal de concorrente", "Combinar forma de pagamento", "Passar valor que não está no pacote",
    "Prometer horário diferente sem confirmar com a equipe", "Aceitar permuta ou parceria",
    "Confirmar reserva", "Dar informação sobre outros clientes",
  ],
} as const;

const norm = (s: string) => s.trim().toLowerCase();

/** O item já está no texto? */
export function hasTerm(text: string, term: string): boolean {
  return text.split(/[,\n;]/).some((p) => norm(p) === norm(term));
}

/** Toca na sugestão: adiciona no fim do texto ("a, b, c") ou tira se já estiver */
export function toggleTerm(text: string, term: string): string {
  const parts = text.split(/[,\n;]/).map((p) => p.trim()).filter(Boolean);
  const exists = parts.some((p) => norm(p) === norm(term));
  const next = exists ? parts.filter((p) => norm(p) !== norm(term)) : [...parts, term];
  return next.join(", ");
}
