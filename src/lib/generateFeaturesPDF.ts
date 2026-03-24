import jsPDF from "jspdf";

const C = {
  primary: [124, 58, 237] as [number, number, number],
  primaryLight: [243, 232, 255] as [number, number, number],
  coverDark: [91, 33, 182] as [number, number, number],
  text: [30, 30, 30] as [number, number, number],
  textSec: [100, 100, 100] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  line: [210, 210, 210] as [number, number, number],
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 20;
const MARGIN_R = 20;
const MARGIN_T = 22;
const MARGIN_B = 25;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const FOOTER_Y = PAGE_H - 15;

let cursorY = MARGIN_T;
let pageCount = 0;

function rgb(c: [number, number, number]) { return c; }
function resetCursor() { cursorY = MARGIN_T; }

function newPage(doc: jsPDF) {
  doc.addPage();
  pageCount++;
  resetCursor();
  addPageHeader(doc);
}

function checkBreak(doc: jsPDF, needed: number) {
  if (cursorY + needed > PAGE_H - MARGIN_B) newPage(doc);
}

function addPageHeader(doc: jsPDF) {
  doc.setDrawColor(...rgb(C.primary));
  doc.setLineWidth(0.4);
  doc.line(MARGIN_L, 12, PAGE_W - MARGIN_R, 12);
  doc.setFontSize(7);
  doc.setTextColor(...rgb(C.textSec));
  doc.setFont("helvetica", "normal");
  doc.text("Celebrei — Funcionalidades da Plataforma", PAGE_W - MARGIN_R, 10, { align: "right" });
  cursorY = MARGIN_T;
}

function addAllFooters(doc: jsPDF, startPage: number) {
  const total = doc.getNumberOfPages();
  for (let i = startPage; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...rgb(C.primary));
    doc.setLineWidth(0.3);
    doc.line(MARGIN_L, FOOTER_Y - 3, PAGE_W - MARGIN_R, FOOTER_Y - 3);
    doc.setFontSize(7);
    doc.setTextColor(...rgb(C.textSec));
    doc.setFont("helvetica", "normal");
    doc.text(`Página ${i - startPage + 1}`, PAGE_W / 2, FOOTER_Y, { align: "center" });
    doc.text("Celebrei — Funcionalidades", MARGIN_L, FOOTER_Y);
  }
}

function loadImageAsBase64(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("timeout")), 5000);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) data[i + 3] = 0;
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) { reject(e); }
    };
    img.onerror = () => { clearTimeout(timeout); reject(new Error("load failed")); };
    img.src = src;
  });
}

// ── Feature data ──────────────────────────────────────────────
export interface FeatureCategory {
  title: string;
  emoji: string;
  features: { name: string; desc: string }[];
}

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    title: "CRM & Vendas",
    emoji: "📊",
    features: [
      { name: "Kanban de Leads", desc: "Painel visual com arrastar-e-soltar para gerenciar etapas do funil." },
      { name: "Tabela de Leads", desc: "Visão em lista com busca, ordenação e filtros avançados." },
      { name: "Filtros Combinados", desc: "Filtre por campanha, unidade, status, responsável, mês e período." },
      { name: "Ficha do Lead", desc: "Detalhes completos com histórico, observações e timeline." },
      { name: "Transferência de Leads", desc: "Transfira leads entre atendentes com notificação automática." },
      { name: "Exportação CSV", desc: "Exporte a base de leads filtrada para planilha." },
      { name: "Métricas em Tempo Real", desc: "Cards com contagem por status e taxa de conversão." },
      { name: "Score de Leads", desc: "Pontuação automática baseada em engajamento e perfil." },
    ],
  },
  {
    title: "WhatsApp & Automações",
    emoji: "💬",
    features: [
      { name: "Chat em Tempo Real", desc: "Interface completa de WhatsApp integrada ao CRM." },
      { name: "Envio de Mídia", desc: "Fotos, vídeos, áudios, documentos e vCards." },
      { name: "Bot de Atendimento", desc: "Chatbot configurável com fluxo de perguntas e respostas." },
      { name: "Bot da Landing Page", desc: "Bot específico para leads da LP com sequência personalizada." },
      { name: "Reativação Automática", desc: "Disparo automático para leads inativos com 1, 2 e 3 meses." },
      { name: "Confirmação de Visita", desc: "Mensagem automática de lembrete antes da visita agendada." },
      { name: "Envio para Grupos", desc: "Compartilhe escalas e designações em grupos do WhatsApp." },
      { name: "Materiais de Venda", desc: "Menu de materiais (vídeos, PDFs) para envio rápido." },
      { name: "Flow Builder", desc: "Editor visual de fluxos de conversa com nós e condições." },
      { name: "Download em Lote", desc: "Baixe múltiplas imagens de uma conversa em ZIP." },
    ],
  },
  {
    title: "Agenda & Eventos",
    emoji: "📅",
    features: [
      { name: "Calendário Visual", desc: "Visão mensal de eventos com cores por unidade." },
      { name: "Lista de Eventos", desc: "Visão em lista com filtros e resumo do mês." },
      { name: "Ficha do Evento", desc: "Dados completos: pacote, convidados, horário, valor, responsável." },
      { name: "Checklist de Evento", desc: "Lista de tarefas personalizável por modelo de evento." },
      { name: "Equipe do Evento", desc: "Designação de freelancers com funções e confirmação." },
      { name: "Pré-Reservas", desc: "Bloqueio de data com prazo de expiração automática." },
      { name: "Resumo Mensal", desc: "Cards com total de festas, faturamento e ocupação." },
    ],
  },
  {
    title: "Operações & Formulários",
    emoji: "📋",
    features: [
      { name: "Controle de Festa", desc: "Painel ao vivo com timeline, convidados e status operacional." },
      { name: "Lista de Presença", desc: "Registro digital de convidados com contagem automática." },
      { name: "Manutenção", desc: "Registro de itens de manutenção pré e pós-festa." },
      { name: "Acompanhamento", desc: "Formulário de monitoramento durante a festa." },
      { name: "Informações do Evento", desc: "Página pública com dados essenciais para o cliente." },
      { name: "Cardápio Digital", desc: "Formulário público de escolha de cardápio para o cliente." },
      { name: "Freelancers", desc: "Cadastro, escalas, avaliações e envio de designações." },
    ],
  },
  {
    title: "Contratos & Financeiro",
    emoji: "📄",
    features: [
      { name: "Modelos de Contrato", desc: "Editor rico com variáveis dinâmicas e versionamento." },
      { name: "Geração Automática", desc: "Gere contratos preenchidos a partir dos dados do evento." },
      { name: "Histórico de Versões", desc: "Rastreamento completo de alterações com auditoria." },
      { name: "Envio por WhatsApp", desc: "Envie o contrato como link público pelo chat." },
      { name: "Financeiro do Evento", desc: "Controle de pagamentos, parcelas e resumo financeiro." },
      { name: "Timeline Financeira", desc: "Visualização cronológica de pagamentos recebidos." },
    ],
  },
  {
    title: "Inteligência & IA",
    emoji: "🤖",
    features: [
      { name: "Resumo Diário", desc: "Relatório automático com leads do dia e ações sugeridas." },
      { name: "Prioridades de Venda", desc: "Ranking de leads com maior probabilidade de conversão." },
      { name: "Negociações Paradas", desc: "Alerta de leads sem interação por X dias." },
      { name: "Follow-ups Pendentes", desc: "Lista de follow-ups agendados e atrasados." },
      { name: "Funil de Conversão", desc: "Análise visual das taxas de conversão entre etapas." },
      { name: "Tempo de Resposta", desc: "Métricas de velocidade de atendimento por vendedor." },
      { name: "Relatórios Comerciais", desc: "Dashboards com métricas de vendas por período e unidade." },
      { name: "Correção de Texto IA", desc: "Correção automática de gramática em mensagens." },
    ],
  },
  {
    title: "Portal Hub",
    emoji: "🏢",
    features: [
      { name: "Dashboard Consolidado", desc: "Visão geral de todas as empresas com métricas agregadas." },
      { name: "Gestão de Empresas", desc: "Cadastro, ativação e configuração de empresas filhas." },
      { name: "Gestão de Usuários", desc: "Controle de acesso com permissões por empresa." },
      { name: "Onboarding Guiado", desc: "Formulário de implantação com etapas e acompanhamento." },
      { name: "Comercial B2B", desc: "Funil de prospecção de novos buffets parceiros." },
      { name: "Consumo de IA", desc: "Monitoramento de uso de tokens de IA por empresa." },
      { name: "Treinamento Hub", desc: "Central de materiais de treinamento para as empresas." },
      { name: "Materiais", desc: "Gerenciamento de vídeos e materiais da LP Hub." },
      { name: "Recrutamento", desc: "Formulário público de recrutamento comercial." },
      { name: "Suporte", desc: "Central de suporte com chatbot de IA para empresas." },
    ],
  },
  {
    title: "Interfaces Públicas",
    emoji: "🌐",
    features: [
      { name: "Landing Page Dinâmica", desc: "LP personalizável por empresa com chatbot integrado." },
      { name: "Página B2B", desc: "Landing page institucional para captação de buffets." },
      { name: "Formulário de Avaliação", desc: "Avaliação pós-festa preenchida pelo cliente." },
      { name: "Pré-Festa Público", desc: "Formulário de confirmação de dados antes da festa." },
      { name: "Contrato Público", desc: "Visualização e aceite digital do contrato." },
      { name: "Dados do Contratante", desc: "Formulário para coleta de dados complementares." },
      { name: "Escala Pública", desc: "Visualização da escala de trabalho para freelancers." },
      { name: "Avaliação de Staff", desc: "Formulário público de avaliação de freelancers." },
    ],
  },
  {
    title: "Campanhas & Marketing",
    emoji: "📣",
    features: [
      { name: "Wizard de Campanha", desc: "Criação guiada com IA para texto e segmentação." },
      { name: "Base de Leads", desc: "Importação e gestão de leads para campanhas." },
      { name: "Galeria de Imagens", desc: "Banco de imagens com editor de texto sobre imagem." },
      { name: "Envio em Massa", desc: "Disparo de campanhas com delay configurável e relatório." },
      { name: "Visitas Agendadas", desc: "Módulo de qualificação e agendamento de visitas." },
    ],
  },
];

// ── PDF Generation ────────────────────────────────────────────

function addCoverPage(doc: jsPDF, logoBase64?: string) {
  pageCount = 1;
  doc.setFillColor(...rgb(C.primary));
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  doc.setFillColor(...rgb(C.coverDark));
  doc.rect(0, 0, PAGE_W, 50, "F");

  doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
  doc.circle(170, 60, 80, "F");
  doc.circle(30, 230, 60, "F");
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  let titleY = 110;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", (PAGE_W - 40) / 2, 65, 40, 40);
      titleY = 120;
    } catch { /* ignore */ }
  }

  doc.setTextColor(...rgb(C.white));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(38);
  doc.text("CELEBREI", PAGE_W / 2, titleY, { align: "center" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text("Funcionalidades da Plataforma", PAGE_W / 2, titleY + 12, { align: "center" });

  doc.setDrawColor(...rgb(C.white));
  doc.setLineWidth(0.8);
  doc.line(PAGE_W / 2 - 40, titleY + 22, PAGE_W / 2 + 40, titleY + 22);

  const now = new Date();
  const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  doc.setFontSize(11);
  doc.text(`${months[now.getMonth()]} ${now.getFullYear()}`, PAGE_W / 2, 200, { align: "center" });

  doc.setFillColor(...rgb(C.coverDark));
  doc.rect(0, PAGE_H - 30, PAGE_W, 30, "F");
  doc.setFontSize(9);
  doc.text("celebrei.com", PAGE_W / 2, PAGE_H - 12, { align: "center" });
}

function addCategorySection(doc: jsPDF, cat: FeatureCategory) {
  // Category header
  checkBreak(doc, 20);
  cursorY += 4;

  doc.setFillColor(...rgb(C.primary));
  doc.roundedRect(MARGIN_L, cursorY - 6, CONTENT_W, 14, 2, 2, "F");
  doc.setTextColor(...rgb(C.white));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`${cat.emoji}  ${cat.title}`, MARGIN_L + 6, cursorY + 3);
  cursorY += 14;

  // Features list
  for (const feat of cat.features) {
    const descLines = doc.splitTextToSize(feat.desc, CONTENT_W - 18);
    const neededH = 6 + descLines.length * 4.2;
    checkBreak(doc, neededH);

    // Bullet
    doc.setFillColor(...rgb(C.primary));
    doc.circle(MARGIN_L + 5, cursorY + 0.5, 1.2, "F");

    // Name (bold)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...rgb(C.text));
    doc.text(feat.name, MARGIN_L + 10, cursorY + 1.5);
    cursorY += 5;

    // Description
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...rgb(C.textSec));
    for (const line of descLines) {
      doc.text(line, MARGIN_L + 10, cursorY + 1);
      cursorY += 4.2;
    }
    cursorY += 2;
  }
  cursorY += 4;
}

export async function generateFeaturesPDF() {
  cursorY = MARGIN_T;
  pageCount = 0;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Try to load logo
  let logoBase64: string | undefined;
  try {
    const logoModule = await import("@/assets/logo-celebrei-2.png");
    logoBase64 = await loadImageAsBase64(logoModule.default);
  } catch { /* ignore */ }

  addCoverPage(doc, logoBase64);

  // Content pages
  newPage(doc);

  // Title page
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...rgb(C.primary));
  doc.text("Todas as Funcionalidades", MARGIN_L, cursorY + 6);
  cursorY += 14;

  doc.setDrawColor(...rgb(C.primary));
  doc.setLineWidth(0.6);
  doc.line(MARGIN_L, cursorY, MARGIN_L + 50, cursorY);
  cursorY += 8;

  // Summary
  const totalFeatures = FEATURE_CATEGORIES.reduce((s, c) => s + c.features.length, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...rgb(C.textSec));
  doc.text(`${FEATURE_CATEGORIES.length} categorias  •  ${totalFeatures} funcionalidades`, MARGIN_L, cursorY);
  cursorY += 10;

  for (const cat of FEATURE_CATEGORIES) {
    addCategorySection(doc, cat);
  }

  // Footers
  addAllFooters(doc, 2);

  doc.save("Celebrei_Funcionalidades.pdf");
}
