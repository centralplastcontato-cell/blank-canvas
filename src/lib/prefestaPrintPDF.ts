import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PreFestaQuestion {
  id: string;
  text: string;
  type?: string;
  step?: number;
  internal?: boolean;
}

interface PreFestaTemplate {
  id: string;
  name: string;
  questions: PreFestaQuestion[];
}

interface PreFestaResponse {
  id: string;
  respondent_name: string | null;
  created_at: string;
  answers: any;
  company_events?: { event_date?: string | null; title?: string | null; guest_count?: number | null } | null;
}

interface CompanyInfo {
  name: string;
  logo_url?: string | null;
}

function sanitize(text: string): string {
  return String(text ?? "").replace(/[^\x00-\xFF]/g, "").replace(/\s+/g, " ").trim();
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

export interface PreFestaPdfPrefs {
  pageSize?: "a4" | "letter";
  orientation?: "portrait" | "landscape";
  includeClientInfo?: boolean;
}

export interface PreFestaPdfResult {
  blob: Blob;
  dataUri: string;
  fileName: string;
}

function formatAnswer(value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.map(formatAnswer).join(", ");
  if (typeof value === "object") {
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  const s = String(value);
  // ISO date heuristic
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    try { return format(new Date(s), "dd/MM/yyyy", { locale: ptBR }); } catch {}
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  return s;
}

export async function generatePreFestaPrintPDF(
  response: PreFestaResponse,
  template: PreFestaTemplate,
  company: CompanyInfo,
  options: { save?: boolean; prefs?: PreFestaPdfPrefs } = { save: true },
): Promise<PreFestaPdfResult> {
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

  // Header
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
  doc.text("PRE-FESTA", pageWidth / 2, y, { align: "center" });
  y += 4;

  doc.setDrawColor(180, 50, 80);
  doc.setLineWidth(0.6);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 8;

  // Client info block
  if (includeClientInfo) {
    doc.setFillColor(248, 240, 244);
    const infoStartY = y;
    const lines: string[] = [];
    lines.push(`Cliente: ${sanitize(response.respondent_name || "Anonimo")}`);
    if (response.company_events?.event_date) {
      const dt = new Date(response.company_events.event_date + "T12:00:00");
      lines.push(
        `Data da Festa: ${format(dt, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }).replace(/[^\x00-\xFF]/g, "")}`,
      );
    }
    const guestCount = response.company_events?.guest_count;
    if (guestCount != null && guestCount > 0) {
      lines.push(`Quantidade de pessoas: ${guestCount}`);
    }
    lines.push(`Formulario: ${sanitize(template.name)}`);

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

  // Build Q&A list — answers may be array of {questionId,value} OR object
  const qaPairs: { question: string; answer: string }[] = [];
  const answers = response.answers;
  const questionMap = new Map<string, PreFestaQuestion>();
  (template.questions || []).forEach((q) => questionMap.set(q.id, q));

  if (Array.isArray(answers)) {
    answers.forEach((a: any) => {
      const q = questionMap.get(a.questionId);
      // skip internal questions in PDF
      if (q?.internal) return;
      const qText = q?.text || a.questionId || "Pergunta";
      qaPairs.push({ question: sanitize(qText), answer: sanitize(formatAnswer(a.value)) });
    });
  } else if (answers && typeof answers === "object") {
    Object.entries(answers).forEach(([k, v]) => {
      const q = questionMap.get(k);
      if (q?.internal) return;
      const qText = q?.text || k;
      qaPairs.push({ question: sanitize(qText), answer: sanitize(formatAnswer(v)) });
    });
  }

  // Render Q&A
  doc.setTextColor(30, 30, 30);
  const questionFontSize = 10;
  const answerFontSize = 11;
  const textWidth = contentWidth - 6;

  for (let i = 0; i < qaPairs.length; i++) {
    const { question, answer } = qaPairs[i];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(questionFontSize);
    const qLines = doc.splitTextToSize(question, textWidth);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(answerFontSize);
    const aLines = doc.splitTextToSize(answer || "—", textWidth);

    const blockH = qLines.length * 4.5 + aLines.length * 5 + 5;

    // Page break
    if (y + blockH > pageHeight - 18) {
      doc.addPage();
      y = 15;
    }

    // Zebra background
    if (i % 2 === 0) {
      doc.setFillColor(252, 247, 249);
      doc.rect(marginX, y, contentWidth, blockH, "F");
    }

    let cy = y + 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(questionFontSize);
    doc.setTextColor(120, 120, 120);
    qLines.forEach((line: string) => {
      doc.text(line, marginX + 3, cy);
      cy += 4.5;
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(answerFontSize);
    doc.setTextColor(30, 30, 30);
    aLines.forEach((line: string) => {
      doc.text(line, marginX + 3, cy);
      cy += 5;
    });

    y += blockH + 1;
  }

  // Footer all pages
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

  const safeName = (response.respondent_name || "Cliente")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40);
  const datePart = response.company_events?.event_date
    ? format(new Date(response.company_events.event_date + "T12:00:00"), "dd-MM-yyyy")
    : format(new Date(), "dd-MM-yyyy");
  const fileName = `PreFesta_${safeName}_${datePart}.pdf`;

  if (options.save) doc.save(fileName);

  const blob = doc.output("blob");
  const dataUri = doc.output("datauristring");
  return { blob, dataUri, fileName };
}
