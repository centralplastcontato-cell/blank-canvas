/**
 * Single source of truth for form type configurations.
 * All components that build form URLs or reference form types MUST use this.
 *
 * publicPath  — the URL segment used in the public route (must match App.tsx routes)
 * type        — internal identifier (used in form_automation_settings, lead_history, etc.)
 * label       — human-readable label shown in UI
 * responseTable  — Supabase table that stores form responses
 * templateTable  — Supabase table that stores form templates
 */

export interface FormTypeConfig {
  type: string;
  label: string;
  publicPath: string;
  responseTable: string;
  templateTable: string;
}

export const FORM_TYPE_CONFIGS: FormTypeConfig[] = [
  {
    type: "prefesta",
    label: "Pré-Festa",
    publicPath: "pre-festa",
    responseTable: "prefesta_responses",
    templateTable: "prefesta_templates",
  },
  {
    type: "cardapio",
    label: "Cardápio",
    publicPath: "cardapio",
    responseTable: "cardapio_responses",
    templateTable: "cardapio_templates",
  },
  {
    type: "contrato",
    label: "Dados Complementares",
    publicPath: "contrato",
    responseTable: "contrato_responses",
    templateTable: "contrato_templates",
  },
  {
    type: "avaliacao",
    label: "Avaliação",
    publicPath: "avaliacao",
    responseTable: "evaluation_responses",
    templateTable: "evaluation_templates",
  },
];

/** Lookup a config by its internal type key */
export function getFormTypeConfig(type: string): FormTypeConfig | undefined {
  return FORM_TYPE_CONFIGS.find((c) => c.type === type);
}

/** Build the full public URL for a form */
export function buildFormUrl(
  publicPath: string,
  companySlug: string,
  templateSlug: string,
  eventId?: string
): string {
  const base = `${window.location.origin}/${publicPath}/${companySlug}/${templateSlug}`;
  return eventId ? `${base}?event_id=${eventId}` : base;
}

/** Default messages per form type (used when no custom template is configured) */
export const FORM_TYPE_DEFAULT_MESSAGES: Record<string, string> = {
  prefesta:
    "Olá {{nome}}! 🎉\n\nSua festa está chegando! Para garantir que tudo saia perfeito, precisamos de algumas informações.\n\nPreencha o formulário abaixo:\n{{link}}",
  cardapio:
    "Olá {{nome}}! 🍽️\n\nVamos definir o cardápio da sua festa? Acesse o link abaixo e escolha as opções:\n\n{{link}}",
  contrato:
    "Olá {{nome}}! 😊\n\nEstamos finalizando os detalhes da sua festa no {{empresa}} no dia {{data_evento}}.\n\nPara seguirmos, preciso que você preencha seus dados pessoais e as informações do aniversariante no link abaixo:\n\n{{link}}\n\nAssim o buffet consegue finalizar o preenchimento do contrato com essas informações. 🎉",
  avaliacao:
    "Olá {{nome}}! ⭐\n\nEsperamos que a festa tenha sido incrível! 🎊\n\nNos ajude a melhorar cada vez mais respondendo nossa avaliação:\n{{link}}",
};

/**
 * Known public form path prefixes — used by NotFound page to show
 * contextual error messages when a form link is broken.
 */
export const PUBLIC_FORM_PREFIXES: string[] = [
  ...FORM_TYPE_CONFIGS.map((c) => `/${c.publicPath}`),
  "/freelancer",
  "/lista-presenca",
  "/equipe",
  "/informacoes",
  "/dados-contratante",
  "/assinar-contrato",
  "/escala",
  "/manutencao",
  "/acompanhamento",
  "/festa",
];
