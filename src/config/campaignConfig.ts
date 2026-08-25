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
    headline: "Entrada de R$ 500 e parcele sua festa em até 12x no boleto",
    description: "Garanta a data do seu filho com apenas R$ 500 de entrada e parcele o restante em até 12 boletos — o último vence até 15 dias antes da festa.",
    benefits: [
      "💳 Apenas R$ 500 de entrada",
      "🧾 Parcele em até 12x no boleto",
      "🗓️ Último boleto até 15 dias antes da festa",
      "🏰 Estrutura completa do Castelo da Diversão",
    ],
    validUntil: "",
    conditions: [
      "Entrada de R$ 500 para reservar a data",
      "Parcelamento em até 12x no boleto, com o último vencimento até 15 dias antes da festa",
      "Consulte disponibilidade de datas com nossa equipe",
    ],
  },

  // URGÊNCIA
  urgency: {
    message: "Entrada de R$ 500 e parcele em até 12x no boleto",
    spotsLeft: 0,
    deadline: "",
    endDate: "",
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
