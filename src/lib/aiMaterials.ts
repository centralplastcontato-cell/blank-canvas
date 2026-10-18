/**
 * Materiais que a IA manda no WhatsApp (tabela sales_materials):
 * coleção de fotos, vídeo e PDF de pacotes/cardápio.
 * Usado no passo a passo do buffet que se cadastrou pelo site.
 */
import { supabase } from "@/integrations/supabase/client";

/** Nome da coleção criada a partir das fotos do site (só ela é atualizada sozinha) */
export const SITE_PHOTOS_COLLECTION = "Fotos do buffet";
/** A IA manda no máximo 6; guardamos algumas a mais para o dono escolher depois */
const MAX_COLLECTION_PHOTOS = 10;

export type MaterialKind = "video" | "pdf";
export const MATERIAL_TYPE: Record<MaterialKind, "video" | "pdf_package"> = { video: "video", pdf: "pdf_package" };

export interface AiMaterial {
  id: string;
  type: string;
  name: string;
  file_url: string;
  photo_urls: string[] | null;
  guest_count: number | null;
}

export async function loadAiMaterials(companyId: string): Promise<AiMaterial[]> {
  const { data } = await supabase.from("sales_materials")
    .select("id, type, name, file_url, photo_urls, guest_count")
    .eq("company_id", companyId).eq("is_active", true)
    .in("type", ["photo_collection", "video", "pdf_package"])
    .order("sort_order").order("guest_count", { ascending: true, nullsFirst: true });
  return (data || []) as AiMaterial[];
}

/** As fotos do site viram a coleção que a IA manda (se o dono não montou outra) */
export async function syncSitePhotosCollection(companyId: string, unit: string, photos: string[]): Promise<void> {
  if (!photos.length) return;
  const { data: cols } = await supabase.from("sales_materials")
    .select("id, name").eq("company_id", companyId).eq("type", "photo_collection");
  const mine = (cols || []).find((c) => c.name === SITE_PHOTOS_COLLECTION);
  const photo_urls = photos.slice(0, MAX_COLLECTION_PHOTOS);
  if (mine) {
    await supabase.from("sales_materials").update({ photo_urls, file_url: photo_urls[0] }).eq("id", mine.id);
  } else if (!(cols || []).length) {
    await supabase.from("sales_materials").insert({
      company_id: companyId, unit, type: "photo_collection", name: SITE_PHOTOS_COLLECTION,
      file_url: photo_urls[0], photo_urls, is_active: true, sort_order: 0,
    });
  }
}

/**
 * Envia o vídeo ou um PDF (link assinado do site-builder) e guarda como material da IA.
 * Vídeo: um só (o novo substitui). PDF: pode ter vários, cada um com a sua faixa
 * de convidados (guestCount) ou nenhuma (vale para todos).
 */
export async function uploadAiMaterial(
  companyId: string, unit: string, kind: MaterialKind, file: File, name: string, guestCount: number | null = null,
): Promise<void> {
  const bytes = await file.arrayBuffer().catch(() => new ArrayBuffer(0));
  if (bytes.byteLength === 0) {
    throw new Error("Não consegui ler o arquivo (chegou vazio). No iPhone, salve o arquivo no aparelho (Fotos ou Arquivos) e escolha de novo.");
  }
  const ext = (file.name.split(".").pop() || (kind === "pdf" ? "pdf" : "mp4")).toLowerCase();
  const { data: link, error: fnErr } = await supabase.functions.invoke("site-builder", {
    body: { action: "material-upload-url", company_id: companyId, kind, ext },
  });
  if (fnErr || link?.error) {
    let msg = link?.error as string | undefined;
    if (!msg && fnErr) {
      try { msg = (await (fnErr as { context?: Response }).context?.json())?.error; } catch { /* usa a genérica */ }
    }
    throw new Error(msg || fnErr?.message || "Não consegui preparar o envio.");
  }
  const contentType = file.type || (kind === "pdf" ? "application/pdf" : "video/mp4");
  const { error: upErr } = await supabase.storage.from("sales-materials")
    .uploadToSignedUrl(link.path, link.token, new Blob([bytes], { type: contentType }), { contentType });
  if (upErr) throw new Error(`Não consegui enviar o arquivo (${upErr.message}).`);

  const type = MATERIAL_TYPE[kind];
  const row = { file_url: link.url as string, file_path: link.path as string, name };
  let existingId: string | null = null;
  if (kind === "video") {
    const { data: existing } = await supabase.from("sales_materials")
      .select("id").eq("company_id", companyId).eq("type", type).eq("is_active", true).order("sort_order").limit(1);
    existingId = existing?.[0]?.id ?? null;
  }
  const { error } = existingId
    ? await supabase.from("sales_materials").update(row).eq("id", existingId)
    : await supabase.from("sales_materials").insert({ company_id: companyId, unit, type, is_active: true, sort_order: 0, guest_count: guestCount, ...row });
  if (error) throw new Error(`Arquivo enviado, mas não consegui salvar (${error.message}).`);
}

/** Tira um PDF da lista da IA */
export async function removeAiMaterial(id: string): Promise<void> {
  const { error } = await supabase.from("sales_materials").delete().eq("id", id);
  if (error) throw new Error(`Não consegui tirar (${error.message}).`);
}
