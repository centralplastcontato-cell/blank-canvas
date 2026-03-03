// =========================================
// CONFIGURAÇÃO DA CAMPANHA ATUAL
// Edite este arquivo para atualizar a promoção
// =========================================

export const campaignConfig = {
  // HERO
  title: "Mês do Consumidor",
  subtitle: "Feche sua festa agora e os 10 primeiros contratos ganham bônus especiais para deixar a comemoração ainda mais completa.",
  tagline: "🎉 Mês do Consumidor no Castelo da Diversão",
  
  // OFERTA PRINCIPAL
  offer: {
    headline: "Promoção especial do mês do consumidor",
    description: "Para comemorar o mês do consumidor, o Castelo da Diversão preparou um presente especial para as famílias. Os 10 primeiros contratos fechados garantem bônus exclusivos!",
    benefits: [
      "🎁 Decoração completa",
      "🍬 Docinhos para mesa de decoração",
      "🪑 Toalhas para as mesas dos convidados",
    ],
    validUntil: "31 de Março de 2026",
    conditions: [
      "Válida para os 10 primeiros contratos fechados",
      "Bônus sem custo adicional",
      "Promoção não cumulativa com outras ofertas",
    ],
  },

  // URGÊNCIA
  urgency: {
    message: "Garanta agora a data da festa do seu filho",
    spotsLeft: 10,
    deadline: "Apenas 10 bônus disponíveis",
    endDate: "2026-03-31T23:59:59",
  },

  // CHATBOT - Opções configuráveis
  chatbot: {
    unitOptions: ["Manchester", "Trujillo", "As duas"],
    monthOptions: ["Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
    promoMonths: ["Março"],
    nonPromoMessage: "Atenção: A promoção do Mês do Consumidor é válida apenas para contratos fechados em Março de 2026. Para outros meses, entre em contato para conhecer nossas condições especiais! 😊",
    dayOptions: ["Segunda a Quinta", "Sexta", "Sábado", "Domingo"],
    guestOptions: ["50 pessoas", "60 pessoas", "70 pessoas", "80 pessoas", "90 pessoas", "100 pessoas"],
  },

  // IDENTIFICAÇÃO
  campaignId: "mes-consumidor-2026",
  campaignName: "Mês do Consumidor 2026",
  
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
