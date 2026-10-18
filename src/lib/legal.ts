/**
 * Termos de Uso e Política de Privacidade da Celebrei (primeira versão, para
 * revisão jurídica). Ao mudar o texto, troque LEGAL_VERSION: o cadastro guarda
 * a versão aceita (companies.settings.signup.terms_version).
 */
export const LEGAL_VERSION = "2026-10-18";
export const LEGAL_UPDATED = "18 de outubro de 2026";

export interface LegalSection { title: string; paragraphs: string[] }

export const TERMS: LegalSection[] = [
  {
    title: "1. O que é a Celebrei",
    paragraphs: [
      "A Celebrei é uma plataforma on-line para buffets infantis e de festas. Ela reúne atendimento pelo WhatsApp com inteligência artificial (IA), agenda, site do buffet, gestão de festas, financeiro e outras ferramentas.",
      "Estes Termos valem para o buffet (pessoa física ou jurídica) que cria uma conta na Celebrei e para todas as pessoas que ele cadastra para usar a plataforma (\"usuários\"). Ao criar a conta, você confirma que leu e aceita estes Termos e a Política de Privacidade.",
    ],
  },
  {
    title: "2. Conta e acesso",
    paragraphs: [
      "Para usar a Celebrei é preciso informar dados verdadeiros e mantê-los atualizados. O dono da conta é responsável pelos usuários que convida, pelas permissões que dá a cada um e por manter as senhas em segurança.",
      "A conta criada pelo site passa por uma análise da equipe Celebrei antes de a IA começar a atender. Podemos recusar ou cancelar cadastros com informações falsas ou que violem estes Termos.",
    ],
  },
  {
    title: "3. Atendimento com inteligência artificial",
    paragraphs: [
      "A IA responde os clientes do buffet com base nas informações que o próprio buffet cadastra (perguntas da IA, valores, datas ocupadas, materiais e regras). O buffet é responsável por manter essas informações corretas e atualizadas.",
      "A IA pode errar. Ela não fecha contratos, não dá descontos, não altera festas nem pagamentos: esses assuntos são passados para a equipe do buffet. Recomendamos que o buffet acompanhe as conversas e use o \"Testar a minha IA\" para conferir as respostas.",
      "A Celebrei não se responsabiliza por negócios perdidos ou fechados com base em informação cadastrada de forma errada pelo buffet.",
    ],
  },
  {
    title: "4. WhatsApp e mensagens",
    paragraphs: [
      "O atendimento usa o número de WhatsApp do próprio buffet. O buffet deve seguir as regras de uso do WhatsApp e só mandar mensagens para pessoas que entraram em contato ou autorizaram o contato. Envio de mensagens em massa sem autorização (spam) é proibido.",
      "O WhatsApp é um serviço de terceiros. Bloqueios, quedas ou mudanças feitas pelo WhatsApp fogem do controle da Celebrei. Avisamos o buffet sempre que identificamos um problema na conexão.",
    ],
  },
  {
    title: "5. Site do buffet",
    paragraphs: [
      "O buffet pode publicar um site no endereço nomedobuffet.hubcelebrei.com.br ou no seu próprio domínio. O buffet é responsável pelos textos, fotos, valores e demais conteúdos publicados, e garante que tem o direito de usá-los.",
    ],
  },
  {
    title: "6. Uso permitido",
    paragraphs: [
      "Não é permitido usar a Celebrei para atividades ilegais, enganosas ou que violem direitos de terceiros; tentar acessar dados de outros buffets; copiar, revender ou desmontar a plataforma; ou sobrecarregar os sistemas de propósito.",
    ],
  },
  {
    title: "7. Planos e pagamento",
    paragraphs: [
      "Na fase inicial o uso da Celebrei não tem cobrança automática. Quando houver planos pagos, as condições, valores e formas de pagamento serão informados com antecedência e só passarão a valer depois do aceite do buffet.",
    ],
  },
  {
    title: "8. Disponibilidade e suporte",
    paragraphs: [
      "Trabalhamos para manter a plataforma no ar o tempo todo, mas podem acontecer interrupções para manutenção ou por falhas de fornecedores (internet, hospedagem, WhatsApp). Nesses casos, faremos o possível para resolver rápido e avisar o buffet.",
    ],
  },
  {
    title: "9. Dados e privacidade",
    paragraphs: [
      "O tratamento de dados pessoais segue a Lei Geral de Proteção de Dados (LGPD) e está descrito na Política de Privacidade. Em resumo: os dados dos clientes do buffet pertencem ao buffet, e a Celebrei os trata apenas para prestar o serviço.",
    ],
  },
  {
    title: "10. Cancelamento",
    paragraphs: [
      "O buffet pode pedir o cancelamento da conta a qualquer momento. A Celebrei pode suspender ou cancelar contas que violem estes Termos. Depois do cancelamento, o buffet pode pedir uma cópia dos seus dados por um prazo de 30 dias; depois disso os dados são apagados, exceto o que a lei obrigar a guardar.",
    ],
  },
  {
    title: "11. Responsabilidade",
    paragraphs: [
      "A Celebrei responde pelos danos que causar diretamente na prestação do serviço, nos limites da lei. Não respondemos por lucros que o buffet deixou de ter, por falhas de serviços de terceiros ou por decisões tomadas com base em informações cadastradas pelo buffet.",
    ],
  },
  {
    title: "12. Mudanças nestes Termos",
    paragraphs: [
      "Podemos atualizar estes Termos. Quando a mudança for importante, avisaremos pela plataforma com antecedência. Continuar usando a Celebrei depois da mudança significa aceitar a nova versão.",
    ],
  },
  {
    title: "13. Foro",
    paragraphs: [
      "Estes Termos seguem as leis do Brasil. Fica eleito o foro da comarca de Sorocaba/SP para resolver qualquer questão, salvo quando a lei garantir outro foro ao buffet.",
    ],
  },
];

export const PRIVACY: LegalSection[] = [
  {
    title: "1. Quem somos e o que esta política explica",
    paragraphs: [
      "A Celebrei é uma plataforma para buffets. Esta política explica quais dados pessoais tratamos, para quê, com quem compartilhamos e quais são os seus direitos, de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).",
    ],
  },
  {
    title: "2. Dois papéis diferentes",
    paragraphs: [
      "Dados do buffet e dos seus usuários (nome, e-mail, telefone, dados da empresa): a Celebrei é a controladora desses dados.",
      "Dados dos clientes do buffet (quem conversa pelo WhatsApp, preenche o site ou contrata uma festa): o buffet é o controlador e a Celebrei é a operadora, ou seja, trata esses dados em nome do buffet e só para prestar o serviço contratado.",
    ],
  },
  {
    title: "3. Quais dados tratamos",
    paragraphs: [
      "Do buffet e usuários: nome, e-mail, telefone, cidade, dados da empresa, logotipo, informações cadastradas para a IA e registros de uso da plataforma (acessos, ações realizadas).",
      "Dos clientes do buffet: nome, telefone, mensagens trocadas pelo WhatsApp (textos, áudios, imagens), dados da festa (data, número de convidados, pacote), agendamentos de visita e, quando o buffet usa o financeiro, valores e pagamentos.",
    ],
  },
  {
    title: "4. Para que usamos",
    paragraphs: [
      "Para prestar o serviço: responder os clientes do buffet com a IA, organizar a agenda, montar o site, gerar relatórios e avisos para a equipe do buffet.",
      "Para manter a plataforma segura e funcionando: prevenir fraudes e abusos, corrigir erros e dar suporte.",
      "Para cumprir obrigações legais. Não vendemos dados pessoais e não usamos os dados dos clientes do buffet para outras finalidades.",
    ],
  },
  {
    title: "5. Inteligência artificial",
    paragraphs: [
      "As mensagens dos clientes do buffet são processadas por provedores de inteligência artificial (como OpenAI e Anthropic) apenas para gerar as respostas. Esses provedores atuam como suboperadores, sob contrato, e não usam os dados para treinar os seus modelos pelos canais que utilizamos.",
    ],
  },
  {
    title: "6. Com quem compartilhamos",
    paragraphs: [
      "Com fornecedores necessários para o serviço funcionar: hospedagem e banco de dados (Supabase), hospedagem do site (Vercel), provedores de conexão com o WhatsApp e provedores de inteligência artificial. Todos tratam os dados apenas para essa finalidade.",
      "Com autoridades, quando a lei ou uma ordem judicial exigir.",
    ],
  },
  {
    title: "7. Onde ficam e por quanto tempo",
    paragraphs: [
      "Os dados ficam em servidores de fornecedores que podem estar fora do Brasil, com as garantias previstas na LGPD para transferência internacional.",
      "Guardamos os dados enquanto a conta do buffet estiver ativa. Depois do cancelamento, os dados são apagados em até 30 dias, exceto o que a lei obrigar a guardar por mais tempo.",
    ],
  },
  {
    title: "8. Segurança",
    paragraphs: [
      "Usamos conexão criptografada, controle de acesso por usuário e permissões, separação entre os dados de cada buffet e registro das ações importantes. Nenhum sistema é 100% seguro, mas, se acontecer um incidente que possa causar risco, avisaremos os afetados e a Autoridade Nacional de Proteção de Dados (ANPD), como manda a lei.",
    ],
  },
  {
    title: "9. Seus direitos",
    paragraphs: [
      "Pela LGPD, você pode pedir: confirmação de que tratamos seus dados, acesso, correção, anonimização ou eliminação de dados desnecessários, portabilidade, informação sobre compartilhamento e revogação do consentimento.",
      "Se você é cliente de um buffet, fale primeiro com o buffet, que é o responsável pelos seus dados; a Celebrei ajuda o buffet a atender o seu pedido.",
    ],
  },
  {
    title: "10. Cookies e armazenamento no navegador",
    paragraphs: [
      "Usamos o armazenamento do navegador para manter você conectado e lembrar preferências (por exemplo, a empresa escolhida). No site dos buffets podemos registrar de onde veio a visita (como anúncios) para o buffet saber quais campanhas funcionam.",
    ],
  },
  {
    title: "11. Contato",
    paragraphs: [
      "Para dúvidas sobre privacidade ou para exercer os seus direitos, fale com a Celebrei pelos canais informados em hubcelebrei.com.br. Responderemos no prazo da lei.",
    ],
  },
  {
    title: "12. Mudanças nesta política",
    paragraphs: [
      "Podemos atualizar esta política. A versão em vigor fica sempre nesta página, com a data da última atualização. Mudanças importantes serão avisadas pela plataforma.",
    ],
  },
];
