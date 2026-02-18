import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EventData {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  package_name: string | null;
}

interface Assignment {
  event_id: string;
  freelancer_name: string;
  role: string;
}

interface ScheduleData {
  title: string;
  start_date: string;
  end_date: string;
  company_name: string;
  company_logo: string | null;
  events: EventData[];
  assignments: Assignment[];
}

export async function generateSchedulePDF(data: ScheduleData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Logo
  if (data.company_logo) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = data.company_logo!;
      });
      if (img.complete && img.naturalWidth > 0) {
        const ratio = img.naturalWidth / img.naturalHeight;
        const imgH = 18;
        const imgW = imgH * ratio;
        doc.addImage(img, "PNG", (pageWidth - imgW) / 2, y, imgW, imgH);
        y += imgH + 5;
      }
    } catch { /* skip logo */ }
  }

  // Company name
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.company_name, pageWidth / 2, y, { align: "center" });
  y += 8;

  // Title
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text(data.title, pageWidth / 2, y, { align: "center" });
  y += 6;

  // Period
  const startFormatted = format(parseISO(data.start_date), "dd/MM/yyyy");
  const endFormatted = format(parseISO(data.end_date), "dd/MM/yyyy");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Período: ${startFormatted} a ${endFormatted}`, pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y += 10;

  // For each event, create a table
  for (const event of data.events) {
    const eventAssignments = data.assignments.filter(a => a.event_id === event.id);
    if (eventAssignments.length === 0) continue;

    const dateObj = parseISO(event.event_date);
    const dayName = format(dateObj, "EEEE", { locale: ptBR });
    const dateStr = format(dateObj, "dd/MM/yyyy");
    const timeStr = event.start_time ? ` · ${event.start_time.slice(0, 5)}` : "";

    // Check if we need a new page
    if (y > 250) {
      doc.addPage();
      y = 15;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`📅 ${event.title}`, 14, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${dayName}, ${dateStr}${timeStr}${event.package_name ? ` · ${event.package_name}` : ""}`, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [["Nome", "Função"]],
      body: eventAssignments.map(a => [a.freelancer_name, a.role || "-"]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      theme: "grid",
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });

  doc.save(`${data.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}
