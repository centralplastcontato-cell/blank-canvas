// =========================================
// CONFIGURAÇÃO DA CAMPANHA ATUAL
// Edite este arquivo para atualizar a promoção
// =========================================

export const campaignConfig = {
  // HERO
  title: "Promoção de Páscoa",
  subtitle: "Comemore a Páscoa com uma festa inesquecível! 10 crianças até 8 anos FREE e parcele em até 10x no cartão.",
  tagline: "🐰 Promoção de Páscoa no Castelo da Diversão",
  
  // OFERTA PRINCIPAL
  offer: {
    headline: "Promoção especial de Páscoa",
    description: "Nesta Páscoa, o Castelo da Diversão preparou um presente especial: sua festa com 10 crianças até 8 anos FREE! Parcele em até 10x no cartão.",
    benefits: [
      "10 crianças até 8 anos FREE",
      "Parcelamento em até 10x no cartão",
      "Estrutura completa para sua festa",
      "Equipe especializada e dedicada",
    ],
    validUntil: "20 de Abril de 2026",
    conditions: [
      "Válida para festas agendadas até 20/04/2026",
      "Crianças FREE com até 8 anos de idade",
      "Promoção não cumulativa com outras ofertas",
    ],
  },

  // URGÊNCIA
  urgency: {
    message: "Garanta agora a data da festa do seu filho",
    spotsLeft: 10,
    deadline: "Promoção por tempo limitado",
    endDate: "2026-04-20T23:59:59",
  },

  // CHATBOT - Opções configuráveis
  chatbot: {
    unitOptions: ["Trujillo"],
    monthOptions: ["Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
    promoMonths: [],
    nonPromoMessage: "",
    dayOptions: ["Segunda a Quinta", "Sexta", "Sábado", "Domingo"],
    guestOptions: ["50 pessoas", "60 pessoas", "70 pessoas", "80 pessoas", "90 pessoas", "100 pessoas"],
  },

  // IDENTIFICAÇÃO
  campaignId: "pascoa-2026",
  campaignName: "Promoção de Páscoa 2026",
  
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
