type PublicFormType = "prefesta" | "cardapio" | "contrato" | "avaliacao" | "freelancer";

const PUBLIC_FORM_PATHS: Record<PublicFormType, string> = {
  prefesta: "pre-festa",
  cardapio: "cardapio",
  contrato: "contrato",
  avaliacao: "avaliacao",
  freelancer: "freelancer",
};

interface BuildPublicFormPathOptions {
  type: PublicFormType;
  templateId: string;
  templateSlug?: string | null;
  companySlug?: string | null;
}

interface BuildPublicFormUrlOptions extends BuildPublicFormPathOptions {
  baseUrl?: string;
  eventId?: string | null;
}

const normalizeBaseUrl = (baseUrl?: string | null) => {
  if (!baseUrl) return "";
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export const buildPublicFormPath = ({ type, templateId, templateSlug, companySlug }: BuildPublicFormPathOptions) => {
  const publicPath = PUBLIC_FORM_PATHS[type];
  if (templateSlug && companySlug) {
    return `/${publicPath}/${companySlug}/${templateSlug}`;
  }
  return `/${publicPath}/${templateId}`;
};

export const buildPublicFormUrl = ({ baseUrl, eventId, ...options }: BuildPublicFormUrlOptions) => {
  const path = buildPublicFormPath(options);
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const url = normalizedBaseUrl ? `${normalizedBaseUrl}${path}` : path;

  if (!eventId) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}event_id=${encodeURIComponent(eventId)}`;
};

export const isPublicFormPath = (pathname: string, type: PublicFormType) => {
  const publicPath = PUBLIC_FORM_PATHS[type];
  return pathname.toLowerCase().startsWith(`/${publicPath}`);
};