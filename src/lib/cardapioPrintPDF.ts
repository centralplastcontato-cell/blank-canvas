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
  company_events?: { event_date?: string | null; title?: string | null } | null;
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

export async function generateCardapioPrintPDF(
  response: CardapioResponse,
  template: CardapioTemplate,
  company: CompanyInfo,
  options: { save?: boolean } = { save: true },
): Promise<CardapioPdfResult> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
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
  lines.push(
    `Preenchido em: ${format(new Date(response.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}`,
  );
  lines.push(`Cardapio: ${sanitize(template.name)}`);

  const blockH = lines.length * 6 + 6;
  doc.roundedRect(marginX, infoStartY, contentWidth, blockH, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  let infoY = infoStartY + 6;
  lines.forEach((line) => {
    doc.text(line, marginX + 4, infoY);
    infoY += 6;
  });
  y = infoStartY + blockH + 8;

  // ===== Sections =====
  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 18) {
      doc.addPage();
      y = 15;
    }
  };

  const answersBySection: Record<string, string[]> = {};
  (response.answers || []).forEach((a) => {
    const arr = Array.isArray(a.selected)
      ? a.selected
      : a.selected
      ? [String(a.selected)]
      : [];
    answersBySection[a.sectionId] = arr;
  });

  for (const section of template.sections) {
    const items = answersBySection[section.id] || [];
    if (items.length === 0) continue;

    ensureSpace(20);

    // Section header bar
    doc.setFillColor(245, 230, 235);
    doc.rect(marginX, y, contentWidth, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(150, 30, 60);
    const titleText = sanitize(section.title) || section.id.toUpperCase();
    doc.text(titleText, marginX + 4, y + 6.3);
    y += 12;

    // Items
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);

    const boxSize = 4.2; // mm
    const textX = marginX + 4 + boxSize + 4;
    const textWidth = contentWidth - (textX - marginX) - 4;
    const lineGap = 6.2;
    const rowPadV = 2.2;

    items.forEach((item, idx) => {
      const cleanItem = sanitize(item);
      const wrapped = doc.splitTextToSize(cleanItem, textWidth);
      const textH = wrapped.length * lineGap;
      const rowH = textH + rowPadV * 2;
      ensureSpace(rowH);

      // Zebra background
      if (idx % 2 === 0) {
        doc.setFillColor(252, 247, 249);
        doc.rect(marginX, y, contentWidth, rowH, "F");
      }

      // Checkbox (filled rounded square)
      const boxX = marginX + 4;
      const boxY = y + (rowH - boxSize) / 2;
      doc.setDrawColor(150, 30, 60);
      doc.setFillColor(150, 30, 60);
      doc.setLineWidth(0.4);
      doc.roundedRect(boxX, boxY, boxSize, boxSize, 0.6, 0.6, "FD");

      // White vector checkmark inside the box
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.7);
      doc.setLineCap("round");
      doc.setLineJoin("round");
      doc.line(
        boxX + 0.9,
        boxY + boxSize * 0.55,
        boxX + boxSize * 0.42,
        boxY + boxSize * 0.78,
      );
      doc.line(
        boxX + boxSize * 0.42,
        boxY + boxSize * 0.78,
        boxX + boxSize - 0.7,
        boxY + boxSize * 0.28,
      );

      // Item text
      doc.setFont("helvetica", "normal");
      doc.setTextColor(35, 35, 35);
      doc.text(wrapped, textX, y + rowPadV + 4.2);

      y += rowH;
    });


    y += 6;
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
