// =========================================
// CONFIGURAÇÃO DA CAMPANHA ATUAL
// Edite este arquivo para atualizar a promoção
// =========================================

export const campaignConfig = {
  // HERO
  title: "Castelo da Diversão",
  subtitle: "Há 9 anos transformando aniversários em memórias inesquecíveis. Mais de 4.000 festas realizadas em Sorocaba.",
  tagline: "✨ 9 anos · +4.000 festas realizadas",

  // OFERTA PRINCIPAL
  offer: {
    headline: "Feche sua festa até 18/07 e ganhe 2 bônus incríveis",
    description: "Garanta a data da festa do seu filho até 18 de julho e leve rodízio de mini pizza + decoração completa, sem custo extra.",
    benefits: [
      "🍕 Rodízio de mini pizza incluso",
      "✨ Decoração linda e completa",
      "🏰 Estrutura completa do Castelo da Diversão",
      "🎯 Atendimento personalizado e dedicado",
    ],
    validUntil: "18/07/2026",
    conditions: [
      "Válido para festas fechadas até 18/07/2026",
      "Consulte disponibilidade de datas com nossa equipe",
    ],
  },

  // URGÊNCIA
  urgency: {
    message: "Feche sua festa até 18/07 e ganhe 2 bônus",
    spotsLeft: 0,
    deadline: "Promoção válida até 18 de julho",
    endDate: "2026-07-18T23:59:59",
  },


  // CHATBOT - Opções configuráveis
  chatbot: {
    unitOptions: ["Trujillo"],
    monthOptions: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
    promoMonths: [],
    nonPromoMessage: "",
    dayOptions: ["Segunda a Quinta", "Sexta", "Sábado", "Domingo"],
    guestOptions: ["50 pessoas", "60 pessoas", "70 pessoas", "80 pessoas", "90 pessoas", "100 pessoas"],
  },

  // IDENTIFICAÇÃO
  campaignId: "castelo-institucional",
  campaignName: "Castelo da Diversão",
  
  // EMPRESA (multi-tenant) - ID da empresa padrão para leads da landing page
  companyId: "a0000000-0000-0000-0000-000000000001",
};

// BENEFÍCIOS DO CASTELO (fixos)
export const castleBenefits = [
  {
    icon: "🎠",
    title: "Brinquedos Incríveis",
    description: "Brinquedos incríveis para as crianças se divertirem durante toda a festa",
  },
  {
    icon: "🎉",
    title: "Ambiente Festivo",
    description: "Ambiente preparado especialmente para festas infantis inesquecíveis",
  },
  {
    icon: "🍟",
    title: "Cardápio Delicioso",
    description: "Cardápio delicioso para crianças e adultos com opções variadas",
  },
  {
    icon: "👨‍👩‍👧‍👦",
    title: "Espaço Familiar",
    description: "Espaço confortável para toda a família curtir junto",
  },
  {
    icon: "✨",
    title: "Equipe Dedicada",
    description: "Equipe preparada para cuidar de todos os detalhes da sua festa",
  },
];
