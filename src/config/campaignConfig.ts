// =========================================
// CONFIGURAÇÃO DA CAMPANHA ATUAL
// Edite este arquivo para atualizar a promoção
// =========================================

export const campaignConfig = {
  // HERO
  title: "Esquenta de Carnaval",
  subtitle: "Sua festa com vantagem de verdade!",
  tagline: "🎭 O Carnaval chegou mais cedo!",
  
  // OFERTA PRINCIPAL
  offer: {
    headline: "Oferta Especial por Tempo Limitado",
    description: "Vai fazer festa em fevereiro ou março de 2026? Então essa oferta é pra você!",
    benefits: [
      "10% de desconto à vista",
      "10 convidados grátis no seu pacote",
      "Válida para pacotes Castelo, Super e Premium",
      "Festas realizadas em Fevereiro e Março de 2026",
    ],
    validUntil: "14 de Fevereiro de 2026",
    conditions: [
      "Válida para os 10 primeiros contratos fechados ou até 14/02",
      "Pacotes elegíveis: Castelo, Super e Premium",
      "Festas realizadas em Fevereiro e Março de 2026",
      "Promoção não cumulativa com outras ofertas",
    ],
  },

  // URGÊNCIA
  urgency: {
    message: "⏰ Vagas limitadas! Corra antes que acabe!",
    spotsLeft: 4,
    deadline: "Válida para os 10 primeiros contratos ou até 14/02",
    endDate: "2026-02-14T23:59:59", // Data final da promoção para contagem regressiva
  },

  // CHATBOT - Opções configuráveis
  chatbot: {
    unitOptions: ["Manchester", "Trujillo", "As duas"],
    monthOptions: ["Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
    promoMonths: ["Fevereiro", "Março"],
    nonPromoMessage: "Atenção: A promoção Esquenta de Carnaval é válida apenas para festas realizadas em Fevereiro e Março de 2026. Para outros meses, entre em contato para conhecer nossas condições especiais! 😊",
    dayOptions: ["Segunda a Quinta", "Sexta", "Sábado", "Domingo"],
    guestOptions: ["50 pessoas", "60 pessoas", "70 pessoas", "80 pessoas", "90 pessoas", "100 pessoas"],
  },

  // IDENTIFICAÇÃO
  campaignId: "carnaval-2026",
  campaignName: "Esquenta de Carnaval 2026",
  
  // EMPRESA (multi-tenant) - ID da empresa padrão para leads da landing page
  companyId: "a0000000-0000-0000-0000-000000000001",
};

// BENEFÍCIOS DO CASTELO (fixos)
export const castleBenefits = [
  {
    icon: "🏰",
    title: "Estrutura Completa",
    description: "Espaço amplo e climatizado com capacidade para até 150 convidados",
  },
  {
    icon: "🎪",
    title: "Brinquedos Incríveis",
    description: "Pula-pula, piscina de bolinhas, playground e muito mais diversão",
  },
  {
    icon: "👨‍🍳",
    title: "Buffet Completo",
    description: "Cardápio delicioso para crianças e adultos com opções variadas",
  },
  {
    icon: "🎭",
    title: "Monitores Profissionais",
    description: "Equipe treinada para cuidar da diversão e segurança das crianças",
  },
  {
    icon: "📸",
    title: "Espaço Instagramável",
    description: "Cenários decorados perfeitos para fotos memoráveis",
  },
  {
    icon: "🎉",
    title: "+10 Anos na Cidade",
    description: "Milhares de festas realizadas com excelência e alegria",
  },
];
