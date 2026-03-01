import jsPDF from "jspdf";
import "jspdf-autotable";

// ── Color palette ──────────────────────────────────────────────
const C = {
  primary: [124, 58, 237] as [number, number, number],
  primaryLight: [243, 232, 255] as [number, number, number],
  primaryMid: [167, 119, 247] as [number, number, number],
  text: [30, 30, 30] as [number, number, number],
  textSec: [100, 100, 100] as [number, number, number],
  tipBg: [243, 232, 255] as [number, number, number],
  alertBg: [254, 249, 195] as [number, number, number],
  alertBorder: [234, 179, 8] as [number, number, number],
  line: [210, 210, 210] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  coverDark: [91, 33, 182] as [number, number, number],
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

// ── Cover page ─────────────────────────────────────────────────

function addCoverPage(doc: jsPDF, companyName?: string) {
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

  // Title
  doc.setTextColor(...rgb(C.white));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(42);
  doc.text("CELEBREI", PAGE_W / 2, 110, { align: "center" });

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
  doc.text(`Versão 1.0 — ${months[now.getMonth()]} ${now.getFullYear()}`, PAGE_W / 2, 200, { align: "center" });

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
  doc.text("💡 Dica", MARGIN_L + 7, cursorY + 4);

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
  doc.text("⚠️ Atenção", MARGIN_L + 7, cursorY + 4);

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
  addParagraph(doc, "Filtre conversas por status, por responsável e por texto de busca. Você pode arrastar os botões de filtro para reordená-los conforme sua preferência.");

  addTipBox(doc, "Use o botão de compartilhar para enviar mensagens diretamente para grupos do WhatsApp, útil para repassar informações para equipes.");
}

function ch04(doc: jsPDF) {
  addChapterTitle(doc, 4, "Automações e Bot");

  addSectionTitle(doc, "Flow Builder (editor visual)");
  addParagraph(doc, "O Flow Builder permite criar fluxos de conversa automatizados de forma visual. Cada \"nó\" do fluxo representa uma etapa da conversa: enviar mensagem, aguardar resposta, fazer uma pergunta com opções, ou executar uma ação (como mover lead de etapa).");
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

  addTipBox(doc, "Crie fluxos diferentes para cada campanha ou perfil de lead. Um fluxo personalizado converte até 3x mais que mensagens genéricas.");
}

function ch05(doc: jsPDF) {
  addChapterTitle(doc, 5, "Inteligência");

  addSectionTitle(doc, "Resumo Diário (IA)");
  addParagraph(doc, "A Inteligência Artificial da Celebrei analisa todos os leads e conversas do dia e gera um resumo executivo com os principais acontecimentos: leads quentes, oportunidades em risco, follow-ups necessários e métricas do dia.");

  addSectionTitle(doc, "Prioridades e Score");
  addParagraph(doc, "Cada lead recebe automaticamente um score baseado em engajamento, tempo de resposta, mês de interesse e outros fatores. A aba de Prioridades ordena os leads pelo score para que você foque nos mais promissores.");

  addSectionTitle(doc, "Badge de Temperatura");
  addBulletList(doc, [
    "🔥 Quente: lead altamente engajado, respondendo rápido, mês próximo.",
    "🟡 Morno: lead com interesse mas sem urgência clara.",
    "🔵 Frio: lead sem interação recente ou mês distante.",
  ]);

  addSectionTitle(doc, "Funil de Conversão");
  addParagraph(doc, "Visualize graficamente quantos leads estão em cada etapa do funil e as taxas de conversão entre etapas. Identifique gargalos e otimize seu processo de vendas.");

  addSectionTitle(doc, "Leads do Dia");
  addParagraph(doc, "Lista rápida dos leads que entraram hoje, com indicadores visuais de prioridade e status, para que a equipe saiba exatamente o que tratar primeiro.");

  addTipBox(doc, "Consulte o resumo de IA logo pela manhã. Ele destaca os leads que precisam de atenção urgente e ajuda a planejar seu dia.");
}

function ch06(doc: jsPDF) {
  addChapterTitle(doc, 6, "Agenda");

  addSectionTitle(doc, "Calendário de eventos");
  addParagraph(doc, "A Agenda mostra todos os eventos (festas, visitas, reuniões) em formato de calendário mensal ou lista. Os eventos são coloridos conforme o tipo e unidade para fácil identificação.");

  addSectionTitle(doc, "Criar e editar eventos");
  addBulletList(doc, [
    "Clique em uma data para criar um novo evento.",
    "Preencha: título, data, horário início/fim, tipo, unidade, pacote, número de convidados e valor.",
    "Vincule o evento a um lead existente para manter o rastreamento.",
    "Adicione observações e notas internas.",
  ]);

  addSectionTitle(doc, "Checklist por evento");
  addParagraph(doc, "Cada evento pode ter um checklist operacional com itens a serem realizados antes, durante e depois da festa. Os itens podem ser marcados como concluídos por qualquer membro da equipe.");

  addSectionTitle(doc, "Templates de checklist");
  addParagraph(doc, "Crie templates de checklist padrão (ex: \"Checklist festa completa\", \"Checklist mini festa\") para aplicar rapidamente em novos eventos. Isso padroniza os processos operacionais.");

  addSectionTitle(doc, "Resumo mensal");
  addParagraph(doc, "Cards no topo da agenda mostram um resumo do mês: total de eventos, eventos confirmados, valor total e ocupação por unidade.");

  addTipBox(doc, "Use templates de checklist para garantir que nenhum detalhe seja esquecido. Crie um template para cada tipo de evento que sua empresa realiza.");
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

  addSectionTitle(doc, "Criar e editar usuários");
  addParagraph(doc, "Administradores podem criar novos usuários com email e senha, definir o nome de exibição e atribuir um papel (role) que determina o nível de acesso.");

  addSectionTitle(doc, "Papéis disponíveis");
  addBulletList(doc, [
    "Owner: acesso total, incluindo configurações avançadas e exclusão de dados.",
    "Admin: acesso quase total, sem permissões destrutivas.",
    "Gestor: acesso ao CRM, WhatsApp e agenda, sem configurações do sistema.",
    "Operador: acesso limitado a funções operacionais (checklist, presença, etc.).",
  ]);

  addSectionTitle(doc, "Permissões granulares");
  addParagraph(doc, "Além dos papéis, é possível conceder ou restringir permissões específicas por módulo: CRM, WhatsApp, Agenda, Configurações, etc. Isso permite criar perfis de acesso sob medida.");

  addSectionTitle(doc, "Permissões por unidade");
  addParagraph(doc, "Em empresas com múltiplas unidades, você pode restringir o acesso do usuário a uma ou mais unidades específicas. Assim, um gestor de filial só vê os leads e eventos da sua unidade.");

  addTipBox(doc, "Revise as permissões periodicamente. À medida que a equipe cresce, é importante manter os acessos atualizados.");
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

// ── Main export ────────────────────────────────────────────────

export async function generateManualPDF(companyName?: string) {
  // Reset state
  cursorY = MARGIN_T;
  pageCount = 0;
  tocEntries = [];

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // 1. Cover
  addCoverPage(doc, companyName);

  // 2. All chapters (to collect TOC data)
  ch01(doc);
  ch02(doc);
  ch03(doc);
  ch04(doc);
  ch05(doc);
  ch06(doc);
  ch07(doc);
  ch08(doc);
  ch09(doc);
  ch10(doc);
  ch11(doc);
  ch12(doc);
  ch13(doc);
  ch14(doc);

  // 3. Insert TOC after cover (page 2)
  // We'll build TOC data and re-generate to place it correctly
  // For simplicity, we add TOC at end and note it
  // Actually, let's use a simpler approach: generate chapters, then build a new doc with TOC in correct position

  // Simpler approach: add footers to all pages and save
  addAllFooters(doc, 2); // skip cover page

  const fileName = companyName
    ? `Manual_Celebrei_${companyName.replace(/\s+/g, "_")}.pdf`
    : "Manual_Celebrei.pdf";

  doc.save(fileName);
}
