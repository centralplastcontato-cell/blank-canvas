import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CardapioSection {
  id: string;
  emoji: string;
  title: string;
  instruction?: string;
  max_selections?: number | null;
  options: string[];
}

interface CardapioTemplate {
  id: string;
  name: string;
  sections: CardapioSection[];
}

interface CardapioResponse {
  id: string;
  respondent_name: string | null;
  created_at: string;
  answers: Array<{ sectionId: string; selected: string | string[] | null }>;
  company_events?: { event_date?: string | null; title?: string | null; guest_count?: number | null } | null;
}

interface CompanyInfo {
  name: string;
  logo_url?: string | null;
}

// Strip emoji / non-Latin1 chars (jsPDF helvetica doesn't render them)
function sanitize(text: string): string {
  return text.replace(/[^\x00-\xFF]/g, "").replace(/\s+/g, " ").trim();
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });
    if (img.complete && img.naturalWidth > 0) return img;
  } catch {}
  return null;
}

export interface CardapioPdfResult {
  blob: Blob;
  dataUri: string;
  fileName: string;
}

export interface CardapioPdfPrefs {
  pageSize?: "a4" | "letter";
  orientation?: "portrait" | "landscape";
  includeClientInfo?: boolean;
}

export async function generateCardapioPrintPDF(
  response: CardapioResponse,
  template: CardapioTemplate,
  company: CompanyInfo,
  options: { save?: boolean; prefs?: CardapioPdfPrefs } = { save: true },
): Promise<CardapioPdfResult> {
  const prefs = options.prefs ?? {};
  const pageSize = prefs.pageSize ?? "a4";
  const orientation = prefs.orientation ?? "portrait";
  const includeClientInfo = prefs.includeClientInfo !== false;

  const doc = new jsPDF({ orientation, unit: "mm", format: pageSize });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const contentWidth = pageWidth - marginX * 2;
  let y = 15;

  // ===== Header =====
  if (company.logo_url) {
    const img = await loadImage(company.logo_url);
    if (img) {
      const ratio = img.naturalWidth / img.naturalHeight;
      const imgH = 22;
      const imgW = imgH * ratio;
      doc.addImage(img, "PNG", (pageWidth - imgW) / 2, y, imgW, imgH);
      y += imgH + 4;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(sanitize(company.name) || "Buffet", pageWidth / 2, y, { align: "center" });
  y += 7;

  doc.setFontSize(18);
  doc.setTextColor(180, 50, 80);
  doc.text("CARDAPIO DA FESTA", pageWidth / 2, y, { align: "center" });
  y += 4;

  doc.setDrawColor(180, 50, 80);
  doc.setLineWidth(0.6);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 8;

  // ===== Event info block =====
  if (includeClientInfo) {
    doc.setFillColor(248, 240, 244);
    const infoStartY = y;
    const lines: string[] = [];
    lines.push(`Cliente: ${sanitize(response.respondent_name || "Anonimo")}`);
    if (response.company_events?.event_date) {
      const dt = new Date(response.company_events.event_date + "T12:00:00");
      lines.push(
        `Data da Festa: ${format(dt, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
          .replace(/[^\x00-\xFF]/g, "")}`,
      );
    }
    const guestCount = response.company_events?.guest_count;
    if (guestCount != null && guestCount > 0) {
      lines.push(`Quantidade de pessoas: ${guestCount}`);
    }
    lines.push(`Cardapio: ${sanitize(template.name)}`);

    const blockH = lines.length * 5.2 + 5;
    doc.roundedRect(marginX, infoStartY, contentWidth, blockH, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    let infoY = infoStartY + 5;
    lines.forEach((line) => {
      doc.text(line, marginX + 4, infoY);
      infoY += 5.2;
    });
    y = infoStartY + blockH + 5;
  }

  // ===== Sections (auto-fit single page) =====
  // Pre-collect non-empty sections to compute density
  const answersBySection: Record<string, string[]> = {};
  (response.answers || []).forEach((a) => {
    const arr = Array.isArray(a.selected)
      ? a.selected
      : a.selected
      ? [String(a.selected)]
      : [];
    answersBySection[a.sectionId] = arr;
  });
  const visibleSections = template.sections.filter(
    (s) => (answersBySection[s.id] || []).length > 0,
  );
  const totalItems = visibleSections.reduce(
    (acc, s) => acc + (answersBySection[s.id] || []).length,
    0,
  );

  // Available vertical space until footer
  const availableH = pageHeight - 18 - y;
  // Estimated overhead per section (header + spacing)
  const sectionOverhead = 12 + 4;
  const overheadTotal = visibleSections.length * sectionOverhead;
  const itemsBudget = Math.max(20, availableH - overheadTotal);
  // Compute compact item row height to fit single page
  const idealRowH = totalItems > 0 ? itemsBudget / totalItems : 7;
  // Clamp into a comfortable readable range
  const rowH = Math.max(4.6, Math.min(7.2, idealRowH));
  // Derive font sizes proportionally to row height
  const itemFontSize = rowH >= 6.2 ? 11 : rowH >= 5.4 ? 10 : 9;
  const sectionTitleSize = rowH >= 6 ? 12 : 11;
  const boxSize = Math.min(4, Math.max(2.8, rowH - 2));

  for (const section of visibleSections) {
    const items = answersBySection[section.id] || [];

    // Section header bar (compact)
    const headerH = 7.5;
    doc.setFillColor(245, 230, 235);
    doc.rect(marginX, y, contentWidth, headerH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(sectionTitleSize);
    doc.setTextColor(150, 30, 60);
    const titleText = sanitize(section.title) || section.id.toUpperCase();
    doc.text(titleText, marginX + 4, y + headerH - 2);
    y += headerH + 1.5;

    // Items
    doc.setFont("helvetica", "normal");
    doc.setFontSize(itemFontSize);
    doc.setTextColor(30, 30, 30);

    const textX = marginX + 4 + boxSize + 3;

    items.forEach((item, idx) => {
      const cleanItem = sanitize(item);

      // Zebra background
      if (idx % 2 === 0) {
        doc.setFillColor(252, 247, 249);
        doc.rect(marginX, y, contentWidth, rowH, "F");
      }

      // Empty checkbox (for user to fill after printing)
      const boxX = marginX + 4;
      const boxY = y + (rowH - boxSize) / 2;
      doc.setDrawColor(120, 30, 50);
      doc.setLineWidth(0.4);
      doc.roundedRect(boxX, boxY, boxSize, boxSize, 0.5, 0.5, "S");

      // Item text (centered vertically in row)
      doc.setFont("helvetica", "normal");
      doc.setTextColor(35, 35, 35);
      doc.text(cleanItem, textX, y + rowH / 2 + itemFontSize * 0.12);

      y += rowH;
    });

    y += 3;
  }

  // ===== Footer (all pages) =====
  const total = doc.getNumberOfPages();
  const generatedAt = format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Documento gerado em ${generatedAt}`, marginX, pageHeight - 7);
    doc.text(`Pagina ${i} de ${total}`, pageWidth - marginX, pageHeight - 7, { align: "right" });
  }

  // ===== Output =====
  const safeName = (response.respondent_name || "Cliente")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40);
  const datePart = response.company_events?.event_date
    ? format(new Date(response.company_events.event_date + "T12:00:00"), "dd-MM-yyyy")
    : format(new Date(), "dd-MM-yyyy");
  const fileName = `Cardapio_${safeName}_${datePart}.pdf`;

  if (options.save) {
    doc.save(fileName);
  }

  const blob = doc.output("blob");
  const dataUri = doc.output("datauristring");
  return { blob, dataUri, fileName };
}
