import jsPDF from "jspdf";
import "jspdf-autotable";

// ── Color palette ──────────────────────────────────────────────
const C = {
  primary: [37, 99, 195] as [number, number, number],       // Royal Blue
  primaryLight: [225, 238, 255] as [number, number, number], // Light blue bg
  primaryMid: [90, 150, 220] as [number, number, number],    // Mid blue
  text: [30, 30, 30] as [number, number, number],
  textSec: [100, 100, 100] as [number, number, number],
  tipBg: [225, 238, 255] as [number, number, number],
  alertBg: [254, 249, 195] as [number, number, number],
  alertBorder: [234, 179, 8] as [number, number, number],
  line: [210, 210, 210] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  coverDark: [20, 70, 160] as [number, number, number],      // Darker blue
};

// ── Page constants ─────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 20;
const MARGIN_R = 20;
const MARGIN_T = 22;
const MARGIN_B = 25;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const FOOTER_Y = PAGE_H - 15;

// ── State tracker ──────────────────────────────────────────────
let cursorY = MARGIN_T;
let pageCount = 0;
let tocEntries: { num: number; title: string; page: number }[] = [];

// ── Helpers ────────────────────────────────────────────────────

function rgb(c: [number, number, number]) {
  return c;
}

function resetCursor() {
  cursorY = MARGIN_T;
}

function newPage(doc: jsPDF, addHeaderFooter = true) {
  doc.addPage();
  pageCount++;
  resetCursor();
  if (addHeaderFooter) addPageHeader(doc);
}

function checkBreak(doc: jsPDF, needed: number) {
  if (cursorY + needed > PAGE_H - MARGIN_B) {
    newPage(doc);
  }
}

// ── Page decorations ───────────────────────────────────────────

function addPageHeader(doc: jsPDF) {
  doc.setDrawColor(...rgb(C.primary));
  doc.setLineWidth(0.4);
  doc.line(MARGIN_L, 12, PAGE_W - MARGIN_R, 12);
  doc.setFontSize(7);
  doc.setTextColor(...rgb(C.textSec));
  doc.setFont("helvetica", "normal");
  doc.text("Celebrei — Manual da Plataforma", PAGE_W - MARGIN_R, 10, { align: "right" });
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
    doc.text("Celebrei — Manual da Plataforma", MARGIN_L, FOOTER_Y);
  }
}

// ── Logo loader ────────────────────────────────────────────────

function loadImageAsBase64(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Image load timeout")), 5000);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0);
        // Remove white/near-white background pixels (make transparent)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          // If pixel is white or near-white, make it transparent
          if (r > 230 && g > 230 && b > 230) {
            data[i + 3] = 0; // set alpha to 0
          }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Failed to load image"));
    };
    img.src = src;
  });
}

// ── Cover page ─────────────────────────────────────────────────

function addCoverPage(doc: jsPDF, companyName?: string, logoBase64?: string) {
  pageCount = 1;
  // Full purple background
  doc.setFillColor(...rgb(C.primary));
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  // Decorative darker strip at top
  doc.setFillColor(...rgb(C.coverDark));
  doc.rect(0, 0, PAGE_W, 50, "F");

  // Decorative circles
  doc.setFillColor(255, 255, 255, 0.05 as any);
  doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
  doc.circle(170, 60, 80, "F");
  doc.circle(30, 230, 60, "F");
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // Logo
  let titleY = 110;
  if (logoBase64) {
    try {
      const logoW = 40;
      const logoH = 40;
      doc.addImage(logoBase64, "PNG", (PAGE_W - logoW) / 2, 65, logoW, logoH);
      titleY = 120;
    } catch (e) {
      console.warn("Could not add logo to PDF:", e);
    }
  }

  // Title
  doc.setTextColor(...rgb(C.white));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(42);
  doc.text("CELEBREI", PAGE_W / 2, titleY, { align: "center" });

  // Subtitle
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text("Manual Completo da Plataforma", PAGE_W / 2, 125, { align: "center" });

  // Decorative line
  doc.setDrawColor(...rgb(C.white));
  doc.setLineWidth(0.8);
  doc.line(PAGE_W / 2 - 40, 135, PAGE_W / 2 + 40, 135);

  // Company name
  if (companyName) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "italic");
    doc.text(companyName, PAGE_W / 2, 155, { align: "center" });
  }

  // Version & date
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const now = new Date();
  const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  doc.text(`Versão 3.0 — ${months[now.getMonth()]} ${now.getFullYear()}`, PAGE_W / 2, 200, { align: "center" });

  // Bottom strip
  doc.setFillColor(...rgb(C.coverDark));
  doc.rect(0, PAGE_H - 30, PAGE_W, 30, "F");
  doc.setFontSize(9);
  doc.text("celebrei.com", PAGE_W / 2, PAGE_H - 12, { align: "center" });
}

// ── Table of Contents ──────────────────────────────────────────

function addTableOfContentsPage(doc: jsPDF) {
  newPage(doc);
  const tocPage = pageCount;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...rgb(C.primary));
  doc.text("Sumário", MARGIN_L, cursorY + 8);
  cursorY += 18;

  // Decorative line
  doc.setDrawColor(...rgb(C.primary));
  doc.setLineWidth(0.8);
  doc.line(MARGIN_L, cursorY, MARGIN_L + 30, cursorY);
  cursorY += 12;

  doc.setFontSize(11);
  for (const entry of tocEntries) {
    checkBreak(doc, 8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(C.text));
    const label = `${entry.num}. ${entry.title}`;
    doc.text(label, MARGIN_L + 2, cursorY);

    // Dotted line
    const labelW = doc.getTextWidth(label);
    const pageNumStr = String(entry.page - tocPage);
    const pageNumW = doc.getTextWidth(pageNumStr);
    const dotsStart = MARGIN_L + 2 + labelW + 3;
    const dotsEnd = PAGE_W - MARGIN_R - pageNumW - 3;

    doc.setTextColor(...rgb(C.line));
    doc.setFont("helvetica", "normal");
    let dotX = dotsStart;
    while (dotX < dotsEnd) {
      doc.text(".", dotX, cursorY);
      dotX += 2.5;
    }

    doc.setTextColor(...rgb(C.primary));
    doc.setFont("helvetica", "bold");
    doc.text(pageNumStr, PAGE_W - MARGIN_R, cursorY, { align: "right" });

    cursorY += 9;
  }

  return tocPage;
}

// ── Content helpers ────────────────────────────────────────────

function addChapterTitle(doc: jsPDF, num: number, title: string) {
  newPage(doc);
  const currentPage = pageCount;
  tocEntries.push({ num, title, page: currentPage });

  // Purple side bar
  doc.setFillColor(...rgb(C.primary));
  doc.rect(MARGIN_L - 6, cursorY - 8, 4, 18, "F");

  // Chapter number
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(C.primary));
  doc.text(`CAPÍTULO ${num}`, MARGIN_L + 2, cursorY - 1);

  // Chapter title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(C.text));
  doc.text(title, MARGIN_L + 2, cursorY + 10);

  // Decorative line below
  doc.setDrawColor(...rgb(C.primaryMid));
  doc.setLineWidth(0.5);
  doc.line(MARGIN_L + 2, cursorY + 15, MARGIN_L + 60, cursorY + 15);

  cursorY += 26;
}

function addSectionTitle(doc: jsPDF, title: string) {
  checkBreak(doc, 14);
  cursorY += 4;

  // Small purple dot
  doc.setFillColor(...rgb(C.primary));
  doc.circle(MARGIN_L + 2, cursorY - 1.5, 1.5, "F");

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(C.primary));
  doc.text(title, MARGIN_L + 7, cursorY);

  cursorY += 7;
}

function addParagraph(doc: jsPDF, text: string) {
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(C.text));

  const lines = doc.splitTextToSize(text, CONTENT_W - 4);
  for (const line of lines) {
    checkBreak(doc, 5);
    doc.text(line, MARGIN_L + 2, cursorY);
    cursorY += 5;
  }
  cursorY += 2;
}

function addBulletList(doc: jsPDF, items: string[]) {
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(C.text));

  for (const item of items) {
    const lines = doc.splitTextToSize(item, CONTENT_W - 12);
    checkBreak(doc, lines.length * 5 + 1);

    // Purple bullet
    doc.setFillColor(...rgb(C.primary));
    doc.circle(MARGIN_L + 5, cursorY - 1.3, 1.2, "F");

    for (let j = 0; j < lines.length; j++) {
      doc.text(lines[j], MARGIN_L + 10, cursorY);
      cursorY += 5;
    }
    cursorY += 1;
  }
  cursorY += 2;
}

function addTipBox(doc: jsPDF, text: string) {
  doc.setFontSize(9.5);
  const lines = doc.splitTextToSize(text, CONTENT_W - 20);
  const boxH = lines.length * 4.5 + 10;

  checkBreak(doc, boxH + 4);

  // Background
  doc.setFillColor(...rgb(C.tipBg));
  doc.roundedRect(MARGIN_L, cursorY - 2, CONTENT_W, boxH, 2, 2, "F");

  // Left accent bar
  doc.setFillColor(...rgb(C.primary));
  doc.rect(MARGIN_L, cursorY - 2, 3, boxH, "F");

  // Label
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(C.primary));
  doc.text("DICA", MARGIN_L + 7, cursorY + 4);

  // Text
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(C.text));
  let ty = cursorY + 10;
  for (const line of lines) {
    doc.text(line, MARGIN_L + 7, ty);
    ty += 4.5;
  }

  cursorY += boxH + 5;
}

function addAlertBox(doc: jsPDF, text: string) {
  doc.setFontSize(9.5);
  const lines = doc.splitTextToSize(text, CONTENT_W - 20);
  const boxH = lines.length * 4.5 + 10;

  checkBreak(doc, boxH + 4);

  doc.setFillColor(...rgb(C.alertBg));
  doc.roundedRect(MARGIN_L, cursorY - 2, CONTENT_W, boxH, 2, 2, "F");

  doc.setFillColor(...rgb(C.alertBorder));
  doc.rect(MARGIN_L, cursorY - 2, 3, boxH, "F");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 80, 0);
  doc.text("ATENCAO", MARGIN_L + 7, cursorY + 4);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(C.text));
  let ty = cursorY + 10;
  for (const line of lines) {
    doc.text(line, MARGIN_L + 7, ty);
    ty += 4.5;
  }

  cursorY += boxH + 5;
}

// ── Chapter content ────────────────────────────────────────────

function ch01(doc: jsPDF) {
  addChapterTitle(doc, 1, "Introdução");

  addSectionTitle(doc, "O que é a Celebrei");
  addParagraph(doc, "A Celebrei é uma plataforma completa de gestão para buffets infantis. Ela centraliza o CRM de leads, comunicação via WhatsApp, automação de bots, agenda de eventos, controle operacional de festas, formulários públicos, gestão de freelancers e muito mais — tudo em um único sistema.");
  addParagraph(doc, "Desenvolvida especificamente para o mercado de buffets, a Celebrei entende as particularidades do setor: sazonalidade, múltiplas unidades, equipes de freelancers, e a jornada completa do lead até o pós-festa.");

  addSectionTitle(doc, "Como acessar");
  addBulletList(doc, [
    "Acesse pelo navegador (Chrome, Safari, Firefox) no endereço fornecido pela sua empresa.",
    "Faça login com o email e senha cadastrados pelo administrador.",
    "O sistema é responsivo e funciona em celulares, tablets e desktops.",
  ]);

  addSectionTitle(doc, "Visão geral do painel");
  addParagraph(doc, "Ao fazer login, você verá o menu lateral com acesso a todos os módulos: Central de Atendimento, WhatsApp, Agenda, Inteligência, Operações, Configurações e Treinamento. O acesso a cada módulo depende das permissões do seu perfil.");

  addTipBox(doc, "Cada empresa pode ter módulos diferentes ativados. Se você não encontrar um módulo, peça ao administrador para verificar se ele está habilitado.");
}

function ch02(doc: jsPDF) {
  addChapterTitle(doc, 2, "Central de Atendimento (CRM)");

  addSectionTitle(doc, "Visão Kanban vs Lista");
  addParagraph(doc, "A Central de Atendimento é o coração do CRM. Ela exibe todos os leads organizados em um painel Kanban com colunas que representam cada etapa do funil de vendas: Novo, Contato, Visita, Proposta, Fechado e Perdido.");
  addParagraph(doc, "Você pode alternar entre a visão Kanban (cartões arrastáveis) e a visão de Lista (tabela com ordenação e busca).");

  addSectionTitle(doc, "Filtros avançados");
  addBulletList(doc, [
    "Campanha: filtre leads por campanha de origem (Instagram, Google, Indicação, etc.).",
    "Unidade: veja apenas leads de uma unidade específica.",
    "Status: filtre por etapa do funil.",
    "Responsável: veja leads atribuídos a um atendente específico.",
    "Mês de interesse: filtre por mês da festa desejada.",
    "Período: filtre por data de criação do lead.",
  ]);

  addSectionTitle(doc, "Detalhes do lead");
  addParagraph(doc, "Ao clicar em um lead, uma ficha lateral (sheet) é aberta com todas as informações: nome, telefone, mês de interesse, número de convidados, observações, histórico de interações e status no funil.");
  addParagraph(doc, "Nessa ficha, você pode editar dados, adicionar observações, transferir o lead para outro atendente, agendar visitas e muito mais.");

  addSectionTitle(doc, "Métricas e exportação");
  addParagraph(doc, "No topo da página, cards de resumo mostram quantos leads existem em cada status, quantos foram criados no período filtrado e a taxa de conversão.");
  addBulletList(doc, [
    "Exporte a listagem completa para CSV com um clique.",
    "Os cards de métricas atualizam automaticamente ao aplicar filtros.",
  ]);

  addTipBox(doc, "Arraste os cartões entre as colunas do Kanban para mover um lead de etapa. É a forma mais rápida de atualizar o funil.");

  addSectionTitle(doc, "Notificações e alertas");
  addParagraph(doc, "O sistema exibe banners de alerta quando há transferências de leads pendentes, leads com perguntas não respondidas ou visitas agendadas para o dia.");
}

function ch03(doc: jsPDF) {
  addChapterTitle(doc, 3, "WhatsApp");

  addSectionTitle(doc, "Conectar número");
  addParagraph(doc, "A Celebrei se integra ao WhatsApp através da API W-API. Para conectar, acesse Configurações > WhatsApp e escaneie o QR Code com o celular que será utilizado. A conexão é mantida 24/7 pelo servidor.");

  addAlertBox(doc, "Nunca desconecte o WhatsApp Web no celular após escanear o QR Code. Isso derruba a conexão com a plataforma.");

  addSectionTitle(doc, "Chat em tempo real");
  addParagraph(doc, "A tela de WhatsApp exibe todas as conversas em uma interface semelhante ao WhatsApp Web. Você pode enviar e receber mensagens de texto, áudio, imagens, vídeos e documentos.");
  addBulletList(doc, [
    "Gravação de áudio direto na plataforma.",
    "Envio de imagens e vídeos com preview.",
    "Preview automático de links (link preview card).",
    "Envio de documentos PDF e outros arquivos.",
    "Envio de vCards (contatos) com extração automática de nome e telefone.",
    "Download em lote de imagens (ZIP ou individual) via multi-seleção.",
  ]);

  addSectionTitle(doc, "Alterar status do lead pelo chat");
  addParagraph(doc, "Você pode mudar o status de um lead diretamente na tela de conversa, sem precisar ir ao CRM. Use o menu de ações rápidas na conversa para classificar o lead (Novo, Visita, Orçamento Enviado, Negociando, Fechado, Perdido, etc.). O toast de confirmação exibe uma borda colorida conforme o status escolhido.");

  addSectionTitle(doc, "Favoritos e encerramento");
  addBulletList(doc, [
    "Marque conversas como favoritas para acesso rapido - elas aparecem no topo da lista.",
    "Encerre conversas finalizadas para mantê-las organizadas. Conversas encerradas ficam em um filtro separado.",
    "Reabra conversas encerradas a qualquer momento se o cliente voltar a interagir.",
  ]);

  addSectionTitle(doc, "Materiais de venda");
  addParagraph(doc, "Acesse o menu de Materiais de Venda para enviar PDFs de orçamento, vídeos institucionais, fotos do espaço e outros arquivos pré-cadastrados, sem precisar buscar no celular.");

  addSectionTitle(doc, "Status da conversa");
  addBulletList(doc, [
    "Aberta: conversa ativa aguardando atendimento humano.",
    "Bot: conversa sendo conduzida pelo bot automático.",
    "Encerrada: conversa finalizada.",
  ]);

  addSectionTitle(doc, "Filtros de conversa");
  addParagraph(doc, "Filtre conversas por status, por responsável e por texto de busca. Você pode arrastar os botões de filtro para reordená-los conforme sua preferência. Filtros por status do lead (Novo, Visita, O.E., Negociando, Fechado, Perdido) permitem encontrar rapidamente conversas específicas.");

  addSectionTitle(doc, "Busca por conteúdo");
  addParagraph(doc, "Use a busca por conteúdo dentro das mensagens para encontrar informações específicas em conversas longas. O sistema navega suavemente até a mensagem encontrada.");

  addTipBox(doc, "Use o botão de compartilhar para enviar mensagens diretamente para grupos do WhatsApp, útil para repassar informações para equipes.");
}

function ch04(doc: jsPDF) {
  addChapterTitle(doc, 4, "Automações e Bot");

  addSectionTitle(doc, "Flow Builder (editor visual)");
  addParagraph(doc, "O Flow Builder permite criar fluxos de conversa automatizados de forma visual. Cada 'nó' do fluxo representa uma etapa da conversa: enviar mensagem, aguardar resposta, fazer uma pergunta com opções, ou executar uma ação (como mover lead de etapa).");
  addBulletList(doc, [
    "Arraste e conecte nós para criar o fluxo.",
    "Configure mensagens com variáveis dinâmicas ({nome}, {unidade}, etc.).",
    "Defina condições de ramificação baseadas nas respostas.",
    "Ative a interpretação por IA para respostas abertas.",
    "Visualize o fluxo completo em modo preview.",
  ]);

  addSectionTitle(doc, "Bot de Landing Page");
  addParagraph(doc, "Quando um lead preenche o formulário da landing page, o bot envia automaticamente uma sequência de mensagens no WhatsApp: boas-vindas, perguntas de qualificação (mês, convidados, preferências) e pode até agendar uma visita.");

  addSectionTitle(doc, "Bot de Festa");
  addParagraph(doc, "Para o dia da festa, o bot pode enviar mensagens automáticas para os convidados: confirmação de presença, informações sobre o local, horário e link para formulários.");

  addSectionTitle(doc, "Follow-ups automáticos");
  addParagraph(doc, "O sistema detecta leads sem interação e pode disparar mensagens automáticas de follow-up após um período configurável. Isso garante que nenhum lead seja esquecido.");

  addSectionTitle(doc, "Reativação Inteligente (Fase 4)");
  addParagraph(doc, "O motor de reativação monitora automaticamente leads inativos e envia mensagens personalizadas para tentar reengajá-los. A reativação funciona em 3 fases temporais:");
  addBulletList(doc, [
    "1 mês sem interação: mensagem sutil de retomada de contato.",
    "2 meses sem interação: mensagem com abordagem diferenciada.",
    "3 meses sem interação: última tentativa de reativação.",
  ]);
  addParagraph(doc, "O sistema é configurável em Configurações > Automações > Reativação. Você pode:");
  addBulletList(doc, [
    "Ativar ou desativar cada gatilho de tempo individualmente.",
    "Definir quais status de lead são elegíveis para reativação.",
    "Excluir leads já fechados, perdidos ou que já possuem evento marcado.",
    "Configurar janela de envio (ex: só enviar entre 8h e 18h).",
    "Ativar opções interativas (botões de resposta rápida) para o lead.",
    "Definir limite máximo de mensagens de reativação por lead.",
  ]);
  addParagraph(doc, "Na aba Negociacoes Paradas do modulo Inteligencia, leads que ja receberam reativacao automatica sao identificados com um indicador visual.");

  addAlertBox(doc, "A reativação respeita a janela de horário configurada e os intervalos de segurança entre envios. Leads que já responderam ou estão em contato ativo NÃO recebem mensagem de reativação.");

  addTipBox(doc, "Crie fluxos diferentes para cada campanha ou perfil de lead. Um fluxo personalizado converte até 3x mais que mensagens genéricas.");
}

function ch05(doc: jsPDF) {
  addChapterTitle(doc, 5, "Inteligência Comercial");

  addParagraph(doc, "O módulo de Inteligência Comercial é o centro de análise estratégica do seu buffet. Ele organiza dados de leads, conversas e eventos em dashboards práticos que ajudam a tomar decisões de venda melhores e mais rápidas — sem depender de IA para os dados principais.");

  addSectionTitle(doc, "Aba Relatórios (Dashboard Principal)");
  addParagraph(doc, "A aba Relatórios é o ponto de partida do módulo. Ela exibe os KPIs mais importantes do seu buffet em cards visuais:");
  addBulletList(doc, [
    "Leads recebidos: total de leads captados no período selecionado.",
    "Leads fechados: quantos leads converteram em festa.",
    "Taxa de conversão: percentual de leads que se tornaram clientes.",
    "Visitas realizadas: quantas visitas ao buffet aconteceram.",
    "Comparecimento: taxa de clientes que compareceram à visita agendada.",
    "Faturamento vendido: soma do valor dos contratos fechados.",
    "Ticket médio: valor médio por contrato fechado.",
  ]);
  addParagraph(doc, "Filtre os dados por período (Hoje, 7 dias, 30 dias, Mês atual ou Personalizado) e por unidade. Abaixo dos cards, o Funil de Conversão por Etapa mostra a distribuição dos leads em cada estágio do CRM.");
  addParagraph(doc, "A seção Comparecimento em Visitas detalha visitas previstas, realizadas, não comparecidas, remarcadas e canceladas. A seção Vendas por Período mostra o faturamento consolidado.");

  addSectionTitle(doc, "Prioridades de Venda");
  addParagraph(doc, "Localizada abaixo dos relatórios, esta seção lista automaticamente os 15 leads com maior probabilidade de fechamento. A priorização é calculada sem IA, usando dados do sistema:");
  addBulletList(doc, [
    "Leads que responderam recentemente (últimas horas) ganham prioridade máxima.",
    "Leads no estágio 'Negociando' ou 'Orçamento Enviado' são priorizados.",
    "Leads com visita agendada ou temperatura 'Quente/Pronto' sobem no ranking.",
    "O score de engajamento (0-100) é considerado na ordenação.",
  ]);
  addParagraph(doc, "Cada card mostra nome do lead, motivo da prioridade (ex: 'respondeu agora', 'visita agendada'), status atual e botão para abrir a conversa diretamente no WhatsApp.");

  addSectionTitle(doc, "Alertas Inteligentes");
  addParagraph(doc, "O sistema monitora automaticamente o desempenho comercial e exibe alertas no topo do módulo quando detecta situações que precisam de atenção:");
  addBulletList(doc, [
    "Negociações paradas: muitos leads sem interação há mais de 10 dias.",
    "Orçamentos sem resposta: leads que receberam orçamento mas não responderam.",
    "Queda de conversão: taxa de conversão caiu mais de 30% comparado ao período anterior.",
    "Queda de leads: volume de novos leads caiu mais de 40%.",
    "Baixa ocupação: meses futuros com menos de 30% de ocupação na agenda.",
  ]);
  addParagraph(doc, "Cada alerta possui botões de ação direta: 'Ver negociações', 'Abrir CRM filtrado', 'Abrir agenda no mês', etc. Isso permite resolver o problema com um clique, sem precisar navegar pelo sistema.");

  addSectionTitle(doc, "Aba Resumo do Dia");
  addParagraph(doc, "Painel diário com métricas de leads (novos, atendidos, fechados, perdidos), timeline de eventos importantes e insights gerados pela IA. Selecione períodos de até 31 dias para análise comparativa. Administradores podem personalizar o Contexto da IA com dados do buffet para insights mais precisos.");

  addSectionTitle(doc, "Aba Prioridades (Score e Temperatura)");
  addParagraph(doc, "Cada lead recebe automaticamente um score de 0 a 100 e uma temperatura baseada no engajamento:");
  addBulletList(doc, [
    "[Frio] Baixo engajamento, sem interacao recente.",
    "[Morno] Respondeu mas nao avancou para visita ou orcamento.",
    "[Quente] Pediu visita, orcamento ou demonstrou forte interesse.",
    "[Pronto] Score maximo, orcamento enviado ou visita agendada. Prioridade de fechamento.",
  ]);
  addParagraph(doc, "Os leads são classificados em três grupos: Atender Agora (score bom, temperatura acima de frio), Em Risco (pararam de responder) e Frios (score baixo).");

  addSectionTitle(doc, "Aba Negociações Paradas");
  addParagraph(doc, "Radar que identifica leads em estagios criticos (Visita, Orcamento, Negociacao) onde a interacao humana parou. Inclui score de prioridade, mes da festa, indicador de reativacao automatica e navegacao direta para a conversa. Filtre por estagio ou mes.");

  addSectionTitle(doc, "Aba Follow-ups");
  addParagraph(doc, "Painel Kanban com 4 colunas (1º ao 4º Follow-up) que organiza os leads automaticamente com base na última ação de follow-up. Os intervalos respeitam os delays configurados nas automações do WhatsApp de cada unidade. Cada card permite enviar mensagem com um clique.");

  addSectionTitle(doc, "Aba Funil de Conversão");
  addParagraph(doc, "Distribuição dos leads por etapa do CRM com percentuais e tempo médio em cada etapa. Identifique gargalos no processo de vendas.");

  addSectionTitle(doc, "Aba Leads do Dia");
  addParagraph(doc, "Lista todos os leads criados no dia atual com score, temperatura e status. Busca rápida por nome ou telefone e exportação para análise externa.");

  addSectionTitle(doc, "Resumo IA por Lead");
  addParagraph(doc, "Em cada card de lead, o botão 'Resumo IA' gera um resumo inteligente da conversa, sugere a próxima ação recomendada e cria uma mensagem pronta para enviar com um clique.");

  addTipBox(doc, "Comece o dia pela aba Relatórios para ter uma visão geral. Depois, verifique os Alertas e as Prioridades de Venda para saber exatamente quais leads atender primeiro.");
}

function ch06(doc: jsPDF) {
  addChapterTitle(doc, 6, "Central de Agenda");

  addSectionTitle(doc, "Calendário de eventos");
  addParagraph(doc, "A Central de Agenda mostra todos os eventos (festas, visitas, reuniões) em formato de calendário mensal ou lista. Os eventos são coloridos conforme o tipo e unidade para fácil identificação.");

  addSectionTitle(doc, "Criar e editar eventos");
  addBulletList(doc, [
    "Clique em uma data para criar um novo evento.",
    "Preencha: título, data, horário início/fim, tipo, unidade, pacote, número de convidados e valor.",
    "Vincule o evento a um lead existente para manter o rastreamento.",
    "Adicione observações e notas internas.",
    "Defina o vendedor responsável pelo fechamento.",
  ]);

  addSectionTitle(doc, "Pré-reservas");
  addParagraph(doc, "O sistema suporta pré-reservas com fluxo de aprovação. Leads podem solicitar pré-reserva de uma data, e o gestor aprova ou rejeita. Pré-reservas expiram automaticamente após o período configurado.");

  addSectionTitle(doc, "Visitas agendadas");
  addParagraph(doc, "Gerencie visitas ao buffet diretamente pela agenda:");
  addBulletList(doc, [
    "Agende visitas vinculadas a leads do CRM.",
    "Confirmação automática por WhatsApp antes da visita.",
    "Qualificação da visita: registre notas, interesse e fotos.",
    "Histórico completo de visitas por lead.",
    "Banner de alerta no topo mostra visitas do dia.",
  ]);

  addSectionTitle(doc, "Tarefas por evento");
  addParagraph(doc, "Crie tarefas com prioridade (alta, média, baixa) e categorias. Atribua tarefas a membros da equipe e acompanhe a conclusão.");

  addSectionTitle(doc, "Checklist por evento");
  addParagraph(doc, "Cada evento pode ter um checklist operacional com itens a serem realizados antes, durante e depois da festa. Use templates reutilizáveis para padronizar.");

  addSectionTitle(doc, "Resumo mensal");
  addParagraph(doc, "Cards no topo da agenda mostram um resumo do mês: total de eventos, eventos confirmados, valor total e ocupação por unidade.");

  addTipBox(doc, "Use templates de checklist para garantir que nenhum detalhe seja esquecido. Crie um template para cada tipo de evento.");
}

function ch07(doc: jsPDF) {
  addChapterTitle(doc, 7, "Operações (Controle de Festa)");

  addSectionTitle(doc, "Hub da Festa");
  addParagraph(doc, "O Hub da Festa é uma página dedicada para cada evento, acessível por link público. Nela, a equipe operacional gerencia todos os aspectos da festa em tempo real.");

  addSectionTitle(doc, "Módulos operacionais");
  addBulletList(doc, [
    "Checklist operacional: itens a serem verificados durante a festa.",
    "Equipe e financeiro: controle de quem está presente, cachê de freelancers, custos.",
    "Manutenção pós-festa: registro de ocorrências, danos, pendências.",
    "Acompanhamento: monitoramento em tempo real durante o evento.",
    "Lista de presença: controle de convidados que chegaram.",
    "Informações do evento: dados gerais acessíveis pela equipe.",
  ]);

  addSectionTitle(doc, "Acesso pela equipe");
  addParagraph(doc, "Cada módulo operacional gera um link público que pode ser compartilhado com monitores, recepcionistas e freelancers. Eles acessam pelo celular sem precisar de login.");

  addAlertBox(doc, "Os links públicos dão acesso limitado apenas ao evento específico. Dados de outros eventos ou informações da empresa não são expostos.");
}

function ch08(doc: jsPDF) {
  addChapterTitle(doc, 8, "Formulários Públicos");

  addSectionTitle(doc, "Tipos de formulário");
  addBulletList(doc, [
    "Avaliação pós-festa: clientes avaliam a experiência com notas e comentários.",
    "Pré-festa: informações finais antes do evento (lista de convidados, preferências).",
    "Contrato: coleta de dados para formalização do contrato digital.",
    "Cardápio: seleção de opções do menu pelo cliente.",
  ]);

  addSectionTitle(doc, "Criar e personalizar");
  addParagraph(doc, "Cada tipo de formulário possui um editor onde você configura as perguntas, seções e mensagem de agradecimento. Os formulários são vinculados à empresa e podem ser personalizados por template.");

  addSectionTitle(doc, "Compartilhar");
  addParagraph(doc, "Cada formulário gera um link público (slug) que pode ser enviado por WhatsApp ou email. As respostas ficam registradas e vinculadas ao evento correspondente.");

  addTipBox(doc, "Envie o formulário de avaliação automaticamente após a festa usando o bot. Isso aumenta drasticamente a taxa de resposta.");
}

function ch09(doc: jsPDF) {
  addChapterTitle(doc, 9, "Freelancers");

  addSectionTitle(doc, "Escalas");
  addParagraph(doc, "Crie escalas mensais ou por período para gerenciar a disponibilidade de freelancers (monitores, recreadores, recepcionistas). Cada escala lista os eventos do período e permite que freelancers informem sua disponibilidade.");

  addSectionTitle(doc, "Atribuição a eventos");
  addParagraph(doc, "Após os freelancers informarem disponibilidade, atribua cada um ao evento e função correspondente. O sistema mostra quem está disponível para cada data.");

  addSectionTitle(doc, "Formulário público de disponibilidade");
  addParagraph(doc, "A escala gera um link público que é enviado aos freelancers. Eles acessam pelo celular, veem os eventos e marcam em quais estão disponíveis.");

  addSectionTitle(doc, "Avaliação de freelancers");
  addParagraph(doc, "Após cada evento, avalie os freelancers em critérios como pontualidade, desempenho e postura. O histórico de avaliações ajuda nas futuras escalações.");

  addSectionTitle(doc, "Enviar escala para grupos");
  addParagraph(doc, "Envie a escala finalizada diretamente para grupos do WhatsApp com um clique. O sistema formata automaticamente a mensagem com as atribuições.");

  addTipBox(doc, "Gere o PDF da escala para imprimir e fixar no mural do buffet. Isso complementa a escala digital.");
}

function ch10(doc: jsPDF) {
  addChapterTitle(doc, 10, "Landing Pages Dinâmicas");

  addSectionTitle(doc, "Editor visual");
  addParagraph(doc, "Cada empresa pode ter sua própria landing page de captação de leads, configurável pelo painel. O editor permite personalizar todas as seções:");
  addBulletList(doc, [
    "Hero: imagem de fundo, título, subtítulo e botão de ação.",
    "Galeria: fotos do espaço em carrossel.",
    "Depoimentos: testemunhos de clientes satisfeitos.",
    "Oferta: destaque de pacotes ou promoções.",
    "Vídeo: vídeo institucional ou de tour.",
    "Benefícios: diferenciais do buffet.",
    "Como funciona: etapas do processo de contratação.",
    "Prova social: números e conquistas.",
  ]);

  addSectionTitle(doc, "Tema e cores");
  addParagraph(doc, "Defina cores primárias e secundárias, fontes e estilo visual para que a landing page reflita a identidade da sua marca.");

  addSectionTitle(doc, "Chatbot de captura");
  addParagraph(doc, "A landing page inclui um chatbot interativo que qualifica o lead com perguntas e captura os dados automaticamente para o CRM.");

  addTipBox(doc, "Compartilhe o link da landing page nas suas campanhas de tráfego pago. Ela é otimizada para conversão em dispositivos móveis.");
}

function ch11(doc: jsPDF) {
  addChapterTitle(doc, 11, "Configurações");

  addSectionTitle(doc, "Dados da empresa");
  addParagraph(doc, "Configure nome, logo, telefone, endereço e informações institucionais. Esses dados são usados nos formulários públicos, landing page e mensagens automáticas.");

  addSectionTitle(doc, "Conexão WhatsApp");
  addParagraph(doc, "Gerencie a conexão com o WhatsApp: escaneie QR Code, veja status da conexão, reconecte se necessário.");

  addSectionTitle(doc, "Automações e mensagens");
  addBulletList(doc, [
    "Mensagem de boas-vindas: enviada automaticamente ao primeiro contato.",
    "Mensagem de ausência: enviada fora do horário de atendimento.",
    "Legendas de mídia: textos padrão para envio de fotos e vídeos.",
    "Delay entre mensagens de grupo: intervalo entre envios para evitar bloqueio.",
  ]);

  addSectionTitle(doc, "Materiais de venda");
  addParagraph(doc, "Cadastre PDFs, imagens e vídeos que ficam disponíveis para envio rápido durante o atendimento no WhatsApp.");

  addSectionTitle(doc, "Notificações");
  addParagraph(doc, "Configure para quais grupos do WhatsApp devem ser enviadas notificações de novos leads, visitas agendadas e outros eventos importantes.");

  addAlertBox(doc, "As configurações de automação afetam diretamente o comportamento do bot. Teste sempre após alterar mensagens ou fluxos.");
}

function ch12(doc: jsPDF) {
  addChapterTitle(doc, 12, "Usuários e Permissões");

  addSectionTitle(doc, "Onde acessar");
  addParagraph(doc, "A tela de Usuários fica no menu lateral em Administração > Usuários (rota /admin/users). Apenas perfis Gestor ou Admin Global conseguem abrir essa tela — os demais são redirecionados automaticamente.");

  addSectionTitle(doc, "Como criar um novo usuário");
  addParagraph(doc, "Clique no botão 'Novo Usuário' no topo direito. Preencha nome de exibição, email, senha provisória (mínimo 6 caracteres) e selecione o perfil. O usuário é criado já vinculado à sua empresa e recebe acesso imediato — não é enviado email de confirmação, então repasse a senha pelo canal que preferir.");

  addSectionTitle(doc, "Perfis disponíveis");
  addBulletList(doc, [
    "Admin Global: perfil interno da Celebrei, com acesso a todas as empresas. Não é atribuído a usuários do buffet e fica oculto na listagem.",
    "Gestor: acesso amplo à operação do buffet — CRM, WhatsApp, Agenda, Operações, Financeiro, Relatórios e gestão de usuários da própria empresa.",
    "Comercial: foco em atendimento e vendas — leads, conversas no WhatsApp, agenda comercial, visitas e contratos. Não vê Financeiro nem configurações sensíveis por padrão.",
    "Visualização: somente leitura. Útil para sócios, contadores e auditores que precisam acompanhar sem alterar dados.",
  ]);
  addTipBox(doc, "O perfil define o ponto de partida das permissões. Tudo pode ser refinado depois no painel de Permissões granulares — inclusive abrir acessos extras para um Comercial ou restringir um Gestor.");

  addSectionTitle(doc, "Ações disponíveis em cada card de usuário");
  addBulletList(doc, [
    "Alterar perfil: o seletor de papel ao lado do nome troca o role na hora (Gestor, Comercial, Visualização).",
    "Resetar senha: ícone de cadeado abre uma janela para definir uma nova senha (mínimo 6 caracteres). Útil quando o colaborador esquece o acesso.",
    "Gerenciar permissões: ícone de escudo abre o painel lateral com todas as permissões granulares e restrições por unidade e por instância de WhatsApp.",
    "Excluir usuário: remove o acesso definitivamente. O histórico de ações fica preservado, mas o login deixa de funcionar.",
  ]);

  addSectionTitle(doc, "Permissões granulares");
  addParagraph(doc, "Dentro do painel de permissões, cada módulo aparece como uma lista de chaves ligadas ou desligadas — por exemplo: agenda.faturamento, financial.view, financial.consent, whatsapp.instance.*, leads.unit.*, operacoes.formularios, contratos.editar_template. Por padrão tudo vem permitido (whitelist) e você desliga o que aquele perfil não deve ver. Permissões marcadas com cadeado são exclusivas do Admin Global e não aparecem para o Gestor.");

  addSectionTitle(doc, "Restrições por unidade");
  addParagraph(doc, "Em empresas com mais de uma unidade, na aba 'Unidades' do painel de permissões você marca quais filiais o usuário enxerga. Quem só tem 'Unidade A' marcada nunca verá leads, eventos, conversas ou relatórios da 'Unidade B' — o filtro é aplicado em todas as telas automaticamente.");

  addSectionTitle(doc, "Restrições por instância de WhatsApp");
  addParagraph(doc, "Também é possível restringir quais números de WhatsApp o usuário acessa. Marque 'Todas as instâncias' para liberar tudo, ou selecione instâncias específicas. As permissões de unidade e de instância são sincronizadas: ao liberar um número da unidade, os leads daquela unidade também são liberados em consequência.");

  addSectionTitle(doc, "Boas práticas");
  addBulletList(doc, [
    "Crie um usuário por pessoa — nunca compartilhe login. O histórico (lead_history, audit trail) usa o usuário logado para registrar quem fez cada ação.",
    "Para vendedores externos / freelancers comerciais, use o perfil Comercial restrito à unidade e à instância de WhatsApp correspondente.",
    "Para sócios e contadores que só acompanham, use Visualização. Eles conseguem ver dashboards sem risco de alterar nada.",
    "Ao desligar um colaborador, prefira excluir o usuário em vez de só trocar a senha — assim ele perde acesso imediato a todas as conversas.",
  ]);

  addTipBox(doc, "Revise os acessos a cada novo ciclo (mensal ou trimestral). À medida que a equipe muda de função, é comum que permissões antigas continuem ligadas sem necessidade.");
}

function ch13(doc: jsPDF) {
  addChapterTitle(doc, 13, "Multi-Unidades");

  addSectionTitle(doc, "Criar e gerenciar unidades");
  addParagraph(doc, "Empresas com mais de uma filial podem cadastrar cada unidade no sistema. Cada unidade tem nome, slug e cor identificadora que aparece nos cards de leads e eventos.");

  addSectionTitle(doc, "Cores por unidade");
  addParagraph(doc, "Defina uma cor para cada unidade. Essa cor é usada como indicador visual nos cards do Kanban, no calendário e nos filtros, facilitando a identificação rápida.");

  addSectionTitle(doc, "Filtrar por unidade");
  addParagraph(doc, "Em todas as telas do sistema (CRM, Agenda, WhatsApp), há filtros de unidade. Ao selecionar uma unidade, apenas os dados daquela filial são exibidos.");

  addSectionTitle(doc, "Kanban separado");
  addParagraph(doc, "Na Central de Atendimento, abas no topo permitem alternar entre o Kanban geral (todas as unidades) e Kanbans filtrados por unidade. Isso dá ao gestor uma visão focada.");

  addTipBox(doc, "Configure as cores das unidades com cores bem distintas entre si (ex: azul, verde, laranja). Isso torna a identificação visual instantânea.");
}

function ch14(doc: jsPDF) {
  addChapterTitle(doc, 14, "Treinamento");

  addSectionTitle(doc, "Videoaulas");
  addParagraph(doc, "A área de Treinamento reúne videoaulas gravadas sobre cada funcionalidade da plataforma. Os vídeos são organizados por categoria para fácil navegação.");

  addSectionTitle(doc, "Categorias");
  addBulletList(doc, [
    "Geral: visão geral e primeiros passos.",
    "WhatsApp: configuração e uso do chat integrado.",
    "CRM: como usar a Central de Atendimento e o funil.",
    "Agenda: gestão de eventos e checklists.",
    "Operações: controle de festas e equipe.",
    "Configurações: ajustes do sistema.",
    "Inteligência: uso dos recursos de IA.",
    "Landing Page: configuração da página de captação.",
  ]);

  addSectionTitle(doc, "Player integrado");
  addParagraph(doc, "Clique em qualquer videoaula para abrir o player dentro da própria plataforma. Não é necessário sair do sistema para assistir aos treinamentos.");

  addTipBox(doc, "Assista às videoaulas com novos colaboradores durante o onboarding. É a forma mais eficiente de capacitar a equipe rapidamente.");
}

function ch15(doc: jsPDF) {
  addChapterTitle(doc, 15, "Primeiros Passos — Configurando em 60 Minutos");

  addParagraph(doc, "Este capítulo é um guia rápido para colocar o Celebrei em funcionamento. Siga os 6 passos abaixo na ordem indicada para garantir que cada etapa funcione sobre a anterior.");

  addTipBox(doc, "A Landing Page do seu buffet é configurada pela equipe Celebrei durante o onboarding. Seu papel é garantir que o WhatsApp esteja conectado para que o bot funcione corretamente.");

  addSectionTitle(doc, "Checklist de configuração inicial");
  addBulletList(doc, [
    "1. Configurar dados da empresa",
    "2. Personalizar funil de vendas",
    "3. Conectar WhatsApp",
    "4. Criar primeiro evento na Agenda",
    "5. Testar fluxo de captura de leads",
    "6. Criar primeiro usuário da equipe",
  ]);

  addSectionTitle(doc, "Passo 1: Configurar dados da empresa");
  addParagraph(doc, "Acesse Configurações e preencha o nome do buffet, endereço completo, telefone de contato e faça o upload do logotipo. Esses dados aparecem nas landing pages, propostas e comunicações enviadas pelo bot.");
  addTipBox(doc, "Use uma imagem de logo com fundo transparente (PNG) para melhor resultado visual nas landing pages e PDFs.");

  addSectionTitle(doc, "Passo 2: Personalizar seu funil de vendas");
  addParagraph(doc, "Na Central de Atendimento, revise as etapas do Kanban. Renomeie, reordene ou crie novas colunas de acordo com o fluxo comercial do seu buffet. Recomendamos entre 5 e 7 etapas.");
  addBulletList(doc, [
    "Novo Lead > Contato Inicial > Visita Agendada > Proposta Enviada > Fechado",
    "Adapte os nomes à linguagem da sua equipe para facilitar a adoção.",
  ]);

  addSectionTitle(doc, "Passo 3: Conectar WhatsApp");
  addParagraph(doc, "Acesse Configurações > WhatsApp e clique em 'Conectar'. Escaneie o QR Code com o WhatsApp do número comercial do buffet. Após conectar, envie uma mensagem de teste para verificar que tudo funciona.");
  addAlertBox(doc, "Conecte o WhatsApp antes de testar a captura de leads. O bot depende da conexão ativa para enviar mensagens automáticas aos novos leads.");

  addSectionTitle(doc, "Passo 4: Criar primeiro evento na Agenda");
  addParagraph(doc, "Vá até a Agenda e crie um evento de teste. Preencha data, horário, tipo de evento e número de convidados. Isso permite validar o fluxo operacional: checklist, equipe, controle de festa e formulários públicos.");
  addBulletList(doc, [
    "Defina um evento fictício para explorar todas as funcionalidades sem risco.",
    "Teste o checklist, a atribuição de equipe e o link público de acompanhamento.",
  ]);

  addSectionTitle(doc, "Passo 5: Testar o fluxo de captura de leads");
  addParagraph(doc, "Verifique se os leads estão chegando corretamente no seu painel. Peça à equipe Celebrei para confirmar que a Landing Page está ativa, depois envie uma mensagem de teste pelo WhatsApp conectado.");
  addBulletList(doc, [
    "Acesse a Central de Atendimento e verifique se o lead aparece na primeira coluna do Kanban.",
    "Confira se o bot enviou a mensagem de boas-vindas automaticamente.",
    "Teste também preenchendo o formulário da Landing Page para validar o fluxo completo.",
  ]);
  addAlertBox(doc, "A Landing Page é criada pela equipe Celebrei. Você não precisa se preocupar com isso — apenas verifique se os leads estão chegando no seu painel.");

  addSectionTitle(doc, "Passo 6: Criar primeiro usuário da equipe");
  addParagraph(doc, "Em Usuários, clique em 'Novo Usuário' e cadastre um membro da equipe com email e senha. Atribua o papel adequado (Gestor, Operador, etc.) e, se houver múltiplas unidades, restrinja o acesso à unidade correta.");
  addTipBox(doc, "Siga essa ordem dos 6 passos para garantir que cada funcionalidade esteja pronta quando a seguinte for configurada. Em caso de dúvida, consulte a equipe Celebrei.");
}

function ch16(doc: jsPDF) {
  addChapterTitle(doc, 16, "Boas Práticas de Uso");

  addParagraph(doc, "Este capítulo reúne recomendações estratégicas para extrair o máximo da plataforma. São dicas baseadas na experiência de dezenas de buffets que já utilizam o Celebrei.");

  addSectionTitle(doc, "Estruturando seu funil de vendas");
  addParagraph(doc, "Um funil bem estruturado é a base de um CRM eficiente. Mantenha entre 5 e 7 etapas com nomes claros e objetivos.");
  addBulletList(doc, [
    "Evite criar etapas demais — isso gera confusão e abandono de uso.",
    "Use nomes de ação: 'Aguardando Visita' é melhor que 'Visita'.",
    "Revise o funil a cada trimestre para ajustar ao comportamento real dos leads.",
    "Considere etapas diferentes por tipo de evento (aniversário, corporativo, etc.).",
  ]);

  addSectionTitle(doc, "Frequência ideal de follow-up");
  addParagraph(doc, "O timing do follow-up é crucial para a conversão. Leads quentes esfriam rápido se não receberem atenção.");
  addBulletList(doc, [
    "Primeiro contato: em até 5 minutos após o lead chegar (o bot faz isso automaticamente).",
    "Segundo follow-up: 24 horas após o primeiro contato, se não houve resposta.",
    "Terceiro follow-up: 3 dias depois, com uma abordagem diferente (ex: enviar fotos do espaço).",
    "Último follow-up: 7 dias depois. Se não responder, mova para 'Sem Resposta'.",
    "Nunca abandone um lead quente sem pelo menos 3 tentativas de contato.",
  ]);
  addTipBox(doc, "Use o módulo de Inteligência para identificar quais leads precisam de follow-up urgente. O score e a temperatura ajudam a priorizar.");

  addSectionTitle(doc, "Usando o score corretamente");
  addParagraph(doc, "O score de 0 a 100 é calculado automaticamente com base no engajamento do lead. Entenda como interpretá-lo:");
  addBulletList(doc, [
    "80-100 (Quente): lead altamente engajado. Priorize visita ou proposta.",
    "50-79 (Morno): interessado mas ainda decidindo. Envie materiais e mantenha contato.",
    "20-49 (Frio): baixo engajamento. Faça follow-ups espaçados.",
    "0-19 (Gelado): provavelmente não vai converter neste ciclo. Mantenha no radar para reativação futura.",
  ]);
  addAlertBox(doc, "Não ignore leads frios completamente. Muitos buffets relatam que leads 'gelados' voltam meses depois quando a data do evento se aproxima.");

  addSectionTitle(doc, "Checklist padrão eficiente");
  addParagraph(doc, "Um bom checklist garante que nada seja esquecido na operação do evento. Siga estas boas práticas:");
  addBulletList(doc, [
    "Organize por momentos: Antes do Evento, Durante o Evento, Após o Evento.",
    "Mantenha entre 15 e 25 itens — suficiente para cobrir tudo sem ser exaustivo.",
    "Use templates de checklist para padronizar entre unidades e tipos de evento.",
    "Inclua itens de verificação final: limpeza, checagem de equipamentos, feedback do cliente.",
  ]);

  addSectionTitle(doc, "Organizando múltiplas unidades");
  addParagraph(doc, "Buffets com várias filiais precisam de organização extra para evitar confusão:");
  addBulletList(doc, [
    "Use cores bem distintas para cada unidade (azul, verde, laranja, etc.).",
    "Atribua um gestor responsável por unidade com permissões específicas.",
    "Realize reuniões semanais de alinhamento usando os dados do painel de cada unidade.",
    "Compare métricas entre unidades para identificar boas práticas e pontos de melhoria.",
  ]);

  addSectionTitle(doc, "Rotina diária recomendada");
  addParagraph(doc, "Para melhores resultados, siga esta rotina todas as manhãs:");
  addBulletList(doc, [
    "1. Abra o Resumo Diário (Inteligência) para ver o panorama do dia anterior.",
    "2. Verifique as Prioridades para identificar leads que precisam de ação imediata.",
    "3. Responda os Follow-ups pendentes antes de fazer qualquer outra coisa.",
    "4. Confira a Agenda do dia para se preparar para eventos e visitas.",
    "5. Ao final do dia, registre observações no resumo diário para manter o histórico.",
  ]);
  addTipBox(doc, "Revise suas boas práticas a cada trimestre. O que funciona com 50 leads por mês pode não funcionar com 200. Adapte-se conforme o volume cresce.");
}

function ch17(doc: jsPDF) {
  addChapterTitle(doc, 17, "Campanhas de Marketing");

  addParagraph(doc, "O módulo de Campanhas permite o disparo de mensagens em massa via WhatsApp para leads do seu CRM. É ideal para ações promocionais, reativação de leads frios, datas comemorativas e comunicados gerais.");

  addSectionTitle(doc, "Como funciona o Wizard de Campanha");
  addParagraph(doc, "A criação de uma campanha segue um assistente de 3 etapas simples e guiadas:");
  addBulletList(doc, [
    "Contexto: Defina o nome da campanha, descreva o objetivo e gere as variações de mensagem com auxílio da IA. Você também pode anexar uma imagem promocional.",
    "Audiência: Filtre e selecione os leads que receberão a campanha usando filtros de status (Novo, Fechado, Perdido, etc.), unidade e mês de interesse.",
    "Configuração: Revise o resumo da campanha, ajuste o intervalo entre envios (delay) e confira a prévia da mensagem antes de criar.",
  ]);

  addSectionTitle(doc, "Variações de mensagem com IA");
  addParagraph(doc, "Para reduzir o risco de bloqueio pelo WhatsApp, o sistema gera automaticamente 5 variações da sua mensagem usando inteligência artificial. Cada destinatário recebe uma versão diferente, tornando o disparo mais natural e seguro.");
  addBulletList(doc, [
    "As variações mantêm o sentido original da mensagem, alterando apenas a forma de escrever.",
    "A variável {nome} é substituída automaticamente pelo nome de cada lead.",
    "Você pode revisar e editar cada variação antes de confirmar a campanha.",
  ]);

  addSectionTitle(doc, "Filtros de audiência");
  addParagraph(doc, "Na etapa de Audiência, utilize os filtros para segmentar sua base de leads:");
  addBulletList(doc, [
    "Status: filtre por Novo, Em Atendimento, Fechado, Perdido, Sem Resposta, etc.",
    "Unidade: selecione leads de uma ou mais unidades específicas.",
    "Mês de interesse: filtre pelo mês em que o lead demonstrou interesse para festas.",
  ]);

  addSectionTitle(doc, "Configuração de envio");
  addParagraph(doc, "Antes de disparar, configure os parâmetros de segurança do envio:");
  addBulletList(doc, [
    "Delay (intervalo): defina o tempo de espera entre cada mensagem enviada. Valores entre 45 e 120 segundos são recomendados.",
    "Imagem anexa: se uma imagem foi adicionada na etapa de Contexto, ela será enviada junto com cada mensagem.",
    "Prévia: confira exatamente como a mensagem aparecerá para o destinatário antes de confirmar.",
  ]);

  addSectionTitle(doc, "Acompanhamento em tempo real");
  addParagraph(doc, "Após iniciar o envio, acompanhe o progresso diretamente na tela:");
  addBulletList(doc, [
    "Barra de progresso mostra a porcentagem de envios concluídos.",
    "Status individual por destinatário: Pendente, Enviado ou Erro.",
    "A campanha pode ser executada em segundo plano — você pode navegar para outras telas enquanto o envio continua.",
    "Ao finalizar, um resumo mostra o total de enviados e eventuais erros.",
  ]);

  addTipBox(doc, "Use delays de pelo menos 60 segundos e sempre utilize as variações de mensagem geradas pela IA. Isso reduz significativamente o risco de bloqueio do seu número pelo WhatsApp.");

  addAlertBox(doc, "Evite disparar campanhas para mais de 500 leads de uma só vez. Prefira segmentar em lotes menores para maior segurança e melhores taxas de entrega.");
}

function ch18(doc: jsPDF) {
  addChapterTitle(doc, 18, "Suporte Integrado");

  addParagraph(doc, "A plataforma conta com um sistema de suporte integrado acessível diretamente de qualquer tela do painel. Através do botão flutuante no canto inferior direito, você pode abrir o chat de suporte sem sair da página em que está trabalhando.");

  addSectionTitle(doc, "Como acessar o suporte");
  addParagraph(doc, "Clique no ícone de suporte (fone de ouvido) no canto inferior direito da tela. O chat será aberto em uma janela flutuante sobre a página atual.");
  addBulletList(doc, [
    "O suporte está disponível em todas as páginas autenticadas do painel.",
    "Você não precisa sair da tela atual para pedir ajuda.",
    "O assistente de IA responde instantaneamente às dúvidas mais comuns.",
  ]);

  addSectionTitle(doc, "Tipos de solicitação");
  addParagraph(doc, "Ao abrir o chat, você pode escolher entre três categorias de atendimento:");
  addBulletList(doc, [
    "Dúvida: perguntas sobre funcionalidades, configurações ou fluxos da plataforma.",
    "Erro: relatar problemas técnicos, bugs ou comportamentos inesperados.",
    "Sugestão: enviar ideias de melhorias ou novas funcionalidades desejadas.",
  ]);

  addSectionTitle(doc, "Assistente de IA");
  addParagraph(doc, "O chat de suporte é alimentado por inteligência artificial treinada especificamente sobre a plataforma Celebrei. Ele pode responder dúvidas frequentes, orientar sobre configurações e indicar onde encontrar cada funcionalidade.");
  addBulletList(doc, [
    "Respostas instantâneas para dúvidas operacionais comuns.",
    "Orientações passo a passo sobre configurações do bot, WhatsApp e CRM.",
    "Caso a IA não consiga resolver, um tíquete é criado automaticamente para a equipe humana.",
  ]);

  addSectionTitle(doc, "Diagnóstico automático");
  addParagraph(doc, "Ao reportar um erro, o sistema captura automaticamente informações técnicas do seu navegador para agilizar a resolução:");
  addBulletList(doc, [
    "Logs do console e URL da página onde o erro ocorreu.",
    "Informações do navegador e dispositivo utilizado.",
    "Essas informações são enviadas junto com o tíquete, sem necessidade de ação sua.",
  ]);

  addTipBox(doc, "Sempre que possível, descreva o passo a passo do que estava fazendo quando o erro aconteceu. Isso ajuda a equipe a reproduzir e corrigir o problema mais rapidamente.");

  addAlertBox(doc, "O suporte via chat é exclusivo para dúvidas sobre a plataforma. Para questões comerciais ou financeiras, entre em contato diretamente com seu gestor de conta.");
}

function ch19(doc: jsPDF) {
  addChapterTitle(doc, 19, "Contratos Digitais");

  addParagraph(doc, "O módulo de Contratos permite criar, gerenciar e enviar contratos digitais diretamente pela plataforma, com assinatura online e rastreamento completo.");

  addSectionTitle(doc, "Modelos de contrato");
  addParagraph(doc, "Crie modelos de contrato reutilizáveis com variáveis dinâmicas que são preenchidas automaticamente com dados do evento e do cliente:");
  addBulletList(doc, [
    "Editor de texto rico para formatação profissional (negrito, itálico, listas, tabelas).",
    "Variáveis automáticas: {nome_cliente}, {data_evento}, {valor_total}, {valor_por_extenso}, {pacote}, etc.",
    "Modelos por tipo de evento (aniversário, corporativo, etc.).",
    "Histórico de versões: cada alteração no modelo é versionada.",
    "Ative ou desative modelos conforme a necessidade.",
  ]);

  addSectionTitle(doc, "Geração de contratos");
  addParagraph(doc, "A partir de um evento na agenda, gere o contrato automaticamente:");
  addBulletList(doc, [
    "O sistema preenche todas as variáveis com dados do evento (nome, data, valor, convidados).",
    "Valores sao convertidos automaticamente para extenso (ex: R$ 5.000 = cinco mil reais).",
    "Verificação automática de variáveis não resolvidas antes da geração.",
    "Preview do contrato antes de enviar.",
  ]);

  addSectionTitle(doc, "Envio por WhatsApp");
  addParagraph(doc, "Envie o contrato por WhatsApp diretamente pela plataforma:");
  addBulletList(doc, [
    "Botão 'WhatsApp' envia o PDF do contrato para o cliente.",
    "Botão 'Enviar p/ Assinatura' envia o link para assinatura digital.",
    "Indicadores visuais (verde) confirmam que o envio foi realizado.",
    "O status persiste mesmo após recarregar a página.",
  ]);

  addSectionTitle(doc, "Assinatura digital");
  addParagraph(doc, "O cliente assina o contrato online, sem necessidade de imprimir:");
  addBulletList(doc, [
    "Link público de assinatura compartilhável por WhatsApp.",
    "Canvas de assinatura para o cliente desenhar sua assinatura.",
    "Verificação por código OTP enviado por WhatsApp para segurança.",
    "Registro de IP, data/hora e dispositivo da assinatura.",
  ]);

  addSectionTitle(doc, "Auditoria completa");
  addParagraph(doc, "Todas as ações são registradas em um log de auditoria: criação, edição, envio por WhatsApp, envio para assinatura e assinatura realizada.");

  addTipBox(doc, "Configure a mensagem de envio do contrato em Configurações > WhatsApp > Contrato. Personalize o texto que acompanha o PDF e o link de assinatura.");
  addAlertBox(doc, "Sempre revise o preview do contrato antes de enviar. Verifique se todas as variáveis foram preenchidas corretamente.");
}

function ch20(doc: jsPDF) {
  addChapterTitle(doc, 20, "Financeiro");

  addParagraph(doc, "O módulo Financeiro oferece controle completo das finanças do seu buffet, com dashboard visual, gestão de pagamentos, despesas e contas bancárias.");

  addSectionTitle(doc, "Dashboard financeiro");
  addParagraph(doc, "O dashboard exibe cards interativos com as principais métricas:");
  addBulletList(doc, [
    "Receita total: soma de todos os pagamentos recebidos no período.",
    "Despesas: total de gastos (fixos e variáveis).",
    "Saldo: diferença entre receitas e despesas.",
    "Inadimplência: pagamentos atrasados.",
    "Clique em qualquer card para ver a lista detalhada das transações.",
  ]);

  addSectionTitle(doc, "Pagamentos por evento");
  addParagraph(doc, "Registre pagamentos vinculados a cada evento:");
  addBulletList(doc, [
    "Múltiplas parcelas com datas de vencimento.",
    "Status: pendente, pago, atrasado.",
    "Métodos: PIX, cartão (crédito/débito), boleto, transferência, dinheiro.",
    "Comprovantes anexados (upload de imagens).",
    "Visão agrupada por cliente para acompanhar o histórico.",
  ]);

  addSectionTitle(doc, "Despesas");
  addParagraph(doc, "Controle despesas fixas e variáveis do buffet:");
  addBulletList(doc, [
    "Categorias: aluguel, fornecedores, equipe, manutenção, marketing, etc.",
    "Despesas fixas (recorrentes) vs variáveis (por evento).",
    "Anexe boletos e comprovantes.",
    "Filtre por categoria, período e unidade.",
  ]);

  addSectionTitle(doc, "Contas bancárias");
  addParagraph(doc, "Gerencie múltiplas contas bancárias:");
  addBulletList(doc, [
    "Cadastre contas correntes, poupança, carteiras digitais.",
    "Saldo individual de cada conta.",
    "Transferências entre contas com registro automático.",
    "Conta padrão para novos lançamentos.",
  ]);

  addSectionTitle(doc, "Simulador de taxas de cartão");
  addParagraph(doc, "Cadastre as taxas de cada operadora (Cielo, Stone, Rede, etc.) e simule o valor líquido recebido em transações de crédito e débito, incluindo parcelamentos de 1x a 12x.");

  addSectionTitle(doc, "Relatórios e exportação");
  addBulletList(doc, [
    "Relatórios financeiros com filtros por período e unidade.",
    "Exportação em PDF com resumo visual.",
    "Exportação em Excel (XLSX) com dados detalhados.",
    "Festas encerradas com análise de rentabilidade (receita vs custos).",
  ]);

  addSectionTitle(doc, "KPIs financeiros");
  addParagraph(doc, "Cards de KPI clicáveis permitem drill-down nas métricas. Ao clicar em 'Recebido', 'Despesas' ou outros totais, um painel lateral exibe a lista paginada de transações.");

  addTipBox(doc, "Use a visão de 'Pagamentos por Cliente' para identificar rapidamente clientes com parcelas pendentes e enviar lembretes.");
  addAlertBox(doc, "O acesso ao módulo Financeiro requer a permissão 'financial.view'. Solicite ao administrador caso não consiga visualizar.");
}

function ch21(doc: jsPDF) {
  addChapterTitle(doc, 21, "Empresa Parceira");

  addParagraph(doc, "O módulo Empresa Parceira permite que fornecedores do buffet (confeitarias, decoradores, brindes, etc.) tenham acesso próprio ao sistema para gerenciar seus produtos e pedidos.");

  addSectionTitle(doc, "Painel do Parceiro");
  addParagraph(doc, "Ao acessar /parceiro, o fornecedor vê um dashboard com métricas:");
  addBulletList(doc, [
    "Pedidos do mês: total de pedidos recebidos.",
    "Faturamento: soma dos valores dos pedidos.",
    "Pendentes: pedidos aguardando confirmação.",
    "Itens no catálogo: total de produtos cadastrados.",
  ]);

  addSectionTitle(doc, "Catálogo de produtos");
  addParagraph(doc, "O parceiro gerencia seu catálogo de produtos:");
  addBulletList(doc, [
    "Criar, editar e excluir produtos.",
    "Informações: nome, descrição, preço, categoria e imagem.",
    "Ativar ou desativar produtos conforme disponibilidade.",
    "Categorias customizáveis por tipo de produto.",
  ]);

  addSectionTitle(doc, "Central de Pedidos");
  addParagraph(doc, "Pedidos do buffet são gerenciados em um Kanban visual:");
  addBulletList(doc, [
    "Fluxo: Pendente > Confirmado > Em Producao > Entregue.",
    "Aceitar ou recusar pedidos com um clique.",
    "Marcar progresso da produção.",
    "Confirmar entrega ao buffet.",
    "Alternância entre visão Kanban e Lista.",
  ]);

  addSectionTitle(doc, "Configurações do parceiro");
  addBulletList(doc, [
    "Dados da empresa parceira (nome, logo, contato).",
    "Personalização de aparência (cores, tema).",
    "Configurações de notificações.",
  ]);

  addAlertBox(doc, "Os pedidos são criados pelo buffet (administrador). O parceiro apenas gerencia a produção e entrega dos pedidos recebidos.");
  addTipBox(doc, "Use o menu lateral para navegar entre as paginas do modulo parceiro. Para voltar ao painel principal do buffet, use a opcao correspondente no menu.");
}

// ── Main export ────────────────────────────────────────────────

async function buildManualDoc(companyName?: string) {
  // Reset state
  cursorY = MARGIN_T;
  pageCount = 0;
  tocEntries = [];

  // Load logo (optional)
  let logoBase64: string | undefined;
  try {
    const logoModule = await import("@/assets/logo-celebrei.png");
    logoBase64 = await loadImageAsBase64(logoModule.default);
  } catch (e) {
    console.warn("Could not load logo for PDF:", e);
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  addCoverPage(doc, companyName, logoBase64);

  ch01(doc); ch02(doc); ch03(doc); ch04(doc); ch05(doc);
  ch06(doc); ch07(doc); ch08(doc); ch09(doc); ch10(doc);
  ch11(doc); ch12(doc); ch13(doc); ch14(doc); ch15(doc);
  ch16(doc); ch17(doc); ch18(doc); ch19(doc); ch20(doc);
  ch21(doc);

  addAllFooters(doc, 2);
  return doc;
}

export async function generateManualPDFBytes(companyName?: string): Promise<Uint8Array> {
  const doc = await buildManualDoc(companyName);
  return doc.output("arraybuffer") as unknown as Uint8Array;
}

export async function generateManualPDF(companyName?: string) {
  const doc = await buildManualDoc(companyName);

  const fileName = companyName
    ? `Manual_Celebrei_${companyName.replace(/\s+/g, "_")}.pdf`
    : "Manual_Celebrei.pdf";

  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);

  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    window.open(blobUrl, "_blank");
    document.body.removeChild(link);
  }, 100);
}
