import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { LoadingScreen } from "@/components/ui/loading-screen";

// Eager: root-level routing (tiny, always needed)
import RootPage from "./pages/RootPage";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages with prefetch support
const lazyImports = {
  "/dashboard": () => import("./pages/Index"),
  "/auth": () => import("./pages/Auth"),
  "/atendimento": () => import("./pages/CentralAtendimento"),
  "/configuracoes": () => import("./pages/Configuracoes"),
  "/users": () => import("./pages/Users"),
  "/promo": () => import("./pages/PromoPage"),
  "/hub/comercial-b2b": () => import("./pages/ComercialB2B"),
  "/para-buffets": () => import("./pages/ParaBuffets"),
  "/hub-login": () => import("./pages/HubLogin"),
  "/hub-landing": () => import("./pages/HubLandingPage"),
  "/hub": () => import("./pages/HubDashboard"),
  "/hub/empresas": () => import("./pages/HubEmpresas"),
  "/hub/users": () => import("./pages/HubUsers"),
  "/hub/whatsapp": () => import("./pages/HubWhatsApp"),
  "/hub/onboarding": () => import("./pages/HubOnboarding"),
  "/hub/prospeccao": () => import("./pages/HubProspeccao"),
  "/hub/consumo-ia": () => import("./pages/HubAIUsage"),
  "/hub/treinamento": () => import("./pages/HubTreinamento"),
  "/hub/leads": () => import("./pages/HubLeads"),
  "/hub/suporte": () => import("./pages/HubSuporte"),
  "/hub/materiais": () => import("./pages/HubMateriais"),
  "/hub/recrutamento": () => import("./pages/HubRecruitment"),
  "/hub/funcionalidades": () => import("./pages/HubFuncionalidades"),
  "/hub/backups": () => import("./pages/HubBackups"),
  "/treinamento": () => import("./pages/Treinamento"),
  "/inteligencia": () => import("./pages/Inteligencia"),
  "/agenda": () => import("./pages/Agenda"),
  "/formularios": () => import("./pages/Formularios"),
  "/avaliacoes": () => import("./pages/Avaliacoes"),
  "/pre-festa": () => import("./pages/PreFesta"),
  "/campanhas": () => import("./pages/Campanhas"),
  
  "/contratos": () => import("./pages/ContratosModule"),
  "/contrato": () => import("./pages/Contrato"),
  "/cardapio": () => import("./pages/Cardapio"),
  "/financeiro": () => import("./pages/Financeiro"),
  "/parceiro": () => import("./pages/PartnerDashboard"),
  "/parceiro/catalogo": () => import("./pages/PartnerCatalog"),
  "/parceiro/pedidos": () => import("./pages/PartnerOrders"),
  "/parceiro/config": () => import("./pages/PartnerConfig"),
} as Record<string, () => Promise<any>>;

// Prefetch cache to avoid double-importing
const prefetched = new Set<string>();

export function prefetchRoute(path: string) {
  const normalizedPath = "/" + path.replace(/^\/+/, "");
  if (prefetched.has(normalizedPath)) return;
  const loader = lazyImports[normalizedPath];
  if (loader) {
    prefetched.add(normalizedPath);
    loader();
  }
}

// Lazy-loaded pages
const Index = lazy(lazyImports["/dashboard"]);
const Auth = lazy(lazyImports["/auth"]);
const CentralAtendimento = lazy(lazyImports["/atendimento"]);
const Configuracoes = lazy(lazyImports["/configuracoes"]);
const UserSettings = lazy(() => import("./pages/UserSettings"));
const Users = lazy(lazyImports["/users"]);
const PromoPage = lazy(lazyImports["/promo"]);
const ComercialB2B = lazy(lazyImports["/hub/comercial-b2b"]);
const ParaBuffets = lazy(lazyImports["/para-buffets"]);
const HubLogin = lazy(lazyImports["/hub-login"]);
const HubLandingPage = lazy(lazyImports["/hub-landing"]);
const HubDashboard = lazy(lazyImports["/hub"]);
const HubEmpresas = lazy(lazyImports["/hub/empresas"]);
const HubUsers = lazy(lazyImports["/hub/users"]);
const HubWhatsApp = lazy(lazyImports["/hub/whatsapp"]);
const HubOnboarding = lazy(lazyImports["/hub/onboarding"]);
const HubProspeccao = lazy(lazyImports["/hub/prospeccao"]);
const HubAIUsage = lazy(lazyImports["/hub/consumo-ia"]);
const HubTreinamento = lazy(lazyImports["/hub/treinamento"]);
const HubLeads = lazy(lazyImports["/hub/leads"]);
const HubSuporte = lazy(lazyImports["/hub/suporte"]);
const HubMateriais = lazy(lazyImports["/hub/materiais"]);
const HubRecruitment = lazy(lazyImports["/hub/recrutamento"]);
const HubFuncionalidades = lazy(lazyImports["/hub/funcionalidades"]);
const HubBackups = lazy(lazyImports["/hub/backups"]);
const Treinamento = lazy(lazyImports["/treinamento"]);
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Inteligencia = lazy(lazyImports["/inteligencia"]);
const Agenda = lazy(lazyImports["/agenda"]);
const Formularios = lazy(lazyImports["/formularios"]);
const Avaliacoes = lazy(lazyImports["/avaliacoes"]);
const PreFesta = lazy(lazyImports["/pre-festa"]);
const Campanhas = lazy(lazyImports["/campanhas"]);

const PublicRecruitmentForm = lazy(() => import("./pages/PublicRecruitmentForm"));
const DynamicLandingPage = lazy(() => import("./pages/DynamicLandingPage"));
const PublicEvaluation = lazy(() => import("./pages/PublicEvaluation"));
const PublicPreFesta = lazy(() => import("./pages/PublicPreFesta"));
const PublicContrato = lazy(() => import("./pages/PublicContrato"));
const PublicCardapio = lazy(() => import("./pages/PublicCardapio"));
const PublicStaff = lazy(() => import("./pages/PublicStaff"));
const PublicMaintenance = lazy(() => import("./pages/PublicMaintenance"));
const PublicPartyMonitoring = lazy(() => import("./pages/PublicPartyMonitoring"));
const PublicAttendance = lazy(() => import("./pages/PublicAttendance"));
const PublicAttendanceReview = lazy(() => import("./pages/PublicAttendanceReview"));
const PublicEventInfo = lazy(() => import("./pages/PublicEventInfo"));
const PublicFreelancer = lazy(() => import("./pages/PublicFreelancer"));
const PublicFreelancerSchedule = lazy(() => import("./pages/PublicFreelancerSchedule"));
const Contrato = lazy(lazyImports["/contrato"]);
const ContratosModule = lazy(lazyImports["/contratos"]);
const Cardapio = lazy(lazyImports["/cardapio"]);
const Financeiro = lazy(lazyImports["/financeiro"]);
const PartnerDashboard = lazy(lazyImports["/parceiro"]);
const PartnerCatalog = lazy(lazyImports["/parceiro/catalogo"]);
const PartnerOrders = lazy(lazyImports["/parceiro/pedidos"]);
const PartnerConfig = lazy(lazyImports["/parceiro/config"]);
const PublicPartyControl = lazy(() => import("./pages/PublicPartyControl"));
const PublicClientData = lazy(() => import("./pages/PublicClientData"));
const PublicContractSign = lazy(() => import("./pages/PublicContractSign"));
const AdminFixPrefestaResponses = lazy(() => import("./pages/AdminFixPrefestaResponses"));

const SupportChatbot = lazy(() => import("./components/support/SupportChatbot").then(m => ({ default: m.SupportChatbot })));

const PageLoader = () => <LoadingScreen message="Carregando..." />;

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CompanyProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<RootPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/:slug" element={<Auth />} />
              <Route path="/atendimento" element={<CentralAtendimento />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/perfil" element={<Navigate to="/configuracoes?tab=perfil" replace />} />
              <Route path="/hub/comercial-b2b" element={<ComercialB2B />} />
              <Route path="/para-buffets" element={<ParaBuffets />} />
              <Route path="/dashboard" element={<Index />} />
              <Route path="/users" element={<Navigate to="/configuracoes?tab=usuarios" replace />} />
              <Route path="/promo" element={<PromoPage />} />
              {/* Hub portal - independent */}
              <Route path="/hub-landing" element={<HubLandingPage />} />
              <Route path="/hub-login" element={<HubLogin />} />
              <Route path="/hub" element={<HubDashboard />} />
              <Route path="/hub/empresas" element={<HubEmpresas />} />
              <Route path="/hub/whatsapp" element={<HubWhatsApp />} />
              <Route path="/hub/users" element={<HubUsers />} />
              <Route path="/hub/onboarding" element={<HubOnboarding />} />
              <Route path="/hub/prospeccao" element={<HubProspeccao />} />
              <Route path="/hub/consumo-ia" element={<HubAIUsage />} />
              <Route path="/hub/treinamento" element={<HubTreinamento />} />
              <Route path="/hub/leads" element={<HubLeads />} />
              <Route path="/hub/suporte" element={<HubSuporte />} />
              <Route path="/hub/materiais" element={<HubMateriais />} />
              <Route path="/hub/recrutamento" element={<HubRecruitment />} />
              <Route path="/hub/funcionalidades" element={<HubFuncionalidades />} />
              <Route path="/hub/backups" element={<HubBackups />} />
              <Route path="/recrutamento-comercial" element={<PublicRecruitmentForm />} />
              <Route path="/treinamento" element={<Treinamento />} />
              <Route path="/inteligencia" element={<Inteligencia />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/formularios" element={<Formularios />} />
              <Route path="/avaliacoes" element={<Avaliacoes />} />
              <Route path="/pre-festa" element={<PreFesta />} />
              <Route path="/campanhas" element={<Campanhas />} />
              <Route path="/visitas" element={<Navigate to="/agenda?tab=visitas" replace />} />
              {/* Party control hub */}
              <Route path="/festa/:eventId" element={<PublicPartyControl />} />
              {/* Public client data form */}
              <Route path="/dados-contratante/:token" element={<PublicClientData />} />
              {/* Public contract signing */}
              <Route path="/assinar-contrato/:token" element={<PublicContractSign />} />
              {/* Public dynamic landing page by slug */}
              <Route path="/lp/:slug" element={<DynamicLandingPage />} />
              {/* Public onboarding form */}
              <Route path="/onboarding/:slug" element={<Onboarding />} />
              {/* Public evaluation form */}
              <Route path="/avaliacao/:companySlug/:templateSlug" element={<PublicEvaluation />} />
              <Route path="/avaliacao/:templateId" element={<PublicEvaluation />} />
              {/* Public pre-festa form */}
              <Route path="/pre-festa/:companySlug/:templateSlug" element={<PublicPreFesta />} />
              <Route path="/pre-festa/:templateId" element={<PublicPreFesta />} />
              <Route path="/prefesta/:companySlug/:templateSlug" element={<PublicPreFesta />} />
              <Route path="/prefesta/:templateId" element={<PublicPreFesta />} />
              {/* Public contrato form */}
              <Route path="/contrato/:companySlug/:templateSlug" element={<PublicContrato />} />
              <Route path="/contrato/:templateId" element={<PublicContrato />} />
              <Route path="/contrato" element={<Contrato />} />
              <Route path="/contratos" element={<ContratosModule />} />
              {/* Public cardapio form */}
              <Route path="/cardapio/:companySlug/:templateSlug" element={<PublicCardapio />} />
              <Route path="/cardapio/:templateId" element={<PublicCardapio />} />
              <Route path="/cardapio" element={<Cardapio />} />
              <Route path="/financeiro" element={<Financeiro />} />
              {/* Partner (Empresa Parceira) */}
              <Route path="/parceiro" element={<PartnerDashboard />} />
              <Route path="/parceiro/catalogo" element={<PartnerCatalog />} />
              <Route path="/parceiro/pedidos" element={<PartnerOrders />} />
              <Route path="/parceiro/config" element={<PartnerConfig />} />
              {/* Public staff form */}
              <Route path="/equipe/:recordId" element={<PublicStaff />} />
              {/* Public maintenance form */}
              <Route path="/manutencao/:recordId" element={<PublicMaintenance />} />
              {/* Public party monitoring form */}
              <Route path="/acompanhamento/:recordId" element={<PublicPartyMonitoring />} />
              {/* Public attendance list form */}
              <Route path="/lista-presenca/:recordId/conferencia" element={<PublicAttendanceReview />} />
              <Route path="/lista-presenca/:recordId" element={<PublicAttendance />} />
              {/* Public event info */}
              <Route path="/informacoes/:recordId" element={<PublicEventInfo />} />
              {/* Public freelancer form */}
              <Route path="/freelancer/:companySlug/:templateSlug" element={<PublicFreelancer />} />
              <Route path="/freelancer/:templateId" element={<PublicFreelancer />} />
              {/* Public freelancer schedule */}
              <Route path="/escala/:companySlug/:scheduleSlug" element={<PublicFreelancerSchedule />} />
              <Route path="/escala/:scheduleId" element={<PublicFreelancerSchedule />} />
              {/* Redirects for old routes */}
              <Route path="/admin" element={<Navigate to="/atendimento" replace />} />
              <Route path="/whatsapp" element={<Navigate to="/atendimento" replace />} />
              <Route path="/empresas" element={<Navigate to="/hub/empresas" replace />} />
              <Route path="/comercial-b2b" element={<Navigate to="/hub/comercial-b2b" replace />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <SupportChatbot />
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </CompanyProvider>
  </QueryClientProvider>
);

export default App;
