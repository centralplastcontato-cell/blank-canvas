import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { Loader2 } from "lucide-react";

// Eager: root-level routing (tiny, always needed)
import RootPage from "./pages/RootPage";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const CentralAtendimento = lazy(() => import("./pages/CentralAtendimento"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const UserSettings = lazy(() => import("./pages/UserSettings"));
const Users = lazy(() => import("./pages/Users"));
const PromoPage = lazy(() => import("./pages/PromoPage"));
const ComercialB2B = lazy(() => import("./pages/ComercialB2B"));
const ParaBuffets = lazy(() => import("./pages/ParaBuffets"));
const HubLogin = lazy(() => import("./pages/HubLogin"));
const HubLandingPage = lazy(() => import("./pages/HubLandingPage"));
const HubDashboard = lazy(() => import("./pages/HubDashboard"));
const HubEmpresas = lazy(() => import("./pages/HubEmpresas"));
const HubUsers = lazy(() => import("./pages/HubUsers"));
const HubWhatsApp = lazy(() => import("./pages/HubWhatsApp"));
const HubOnboarding = lazy(() => import("./pages/HubOnboarding"));
const HubProspeccao = lazy(() => import("./pages/HubProspeccao"));
const HubAIUsage = lazy(() => import("./pages/HubAIUsage"));
const HubTreinamento = lazy(() => import("./pages/HubTreinamento"));
const HubLeads = lazy(() => import("./pages/HubLeads"));
const HubSuporte = lazy(() => import("./pages/HubSuporte"));
const HubMateriais = lazy(() => import("./pages/HubMateriais"));
const HubRecruitment = lazy(() => import("./pages/HubRecruitment"));
const Treinamento = lazy(() => import("./pages/Treinamento"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Inteligencia = lazy(() => import("./pages/Inteligencia"));
const Agenda = lazy(() => import("./pages/Agenda"));
const Formularios = lazy(() => import("./pages/Formularios"));
const Avaliacoes = lazy(() => import("./pages/Avaliacoes"));
const PreFesta = lazy(() => import("./pages/PreFesta"));
const Campanhas = lazy(() => import("./pages/Campanhas"));
const Visitas = lazy(() => import("./pages/Visitas"));
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
const Contrato = lazy(() => import("./pages/Contrato"));
const ContratosModule = lazy(() => import("./pages/ContratosModule"));
const Cardapio = lazy(() => import("./pages/Cardapio"));
const PublicPartyControl = lazy(() => import("./pages/PublicPartyControl"));

const SupportChatbot = lazy(() => import("./components/support/SupportChatbot").then(m => ({ default: m.SupportChatbot })));

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="h-10 w-10 animate-spin text-primary" />
  </div>
);

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
              <Route path="/users" element={<Users />} />
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
              <Route path="/recrutamento-comercial" element={<PublicRecruitmentForm />} />
              <Route path="/treinamento" element={<Treinamento />} />
              <Route path="/inteligencia" element={<Inteligencia />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/formularios" element={<Formularios />} />
              <Route path="/avaliacoes" element={<Avaliacoes />} />
              <Route path="/pre-festa" element={<PreFesta />} />
              <Route path="/campanhas" element={<Campanhas />} />
              <Route path="/visitas" element={<Visitas />} />
              {/* Party control hub */}
              <Route path="/festa/:eventId" element={<PublicPartyControl />} />
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
              {/* Public contrato form */}
              <Route path="/contrato/:companySlug/:templateSlug" element={<PublicContrato />} />
              <Route path="/contrato/:templateId" element={<PublicContrato />} />
              <Route path="/contrato" element={<Contrato />} />
              <Route path="/contratos" element={<ContratosModule />} />
              {/* Public cardapio form */}
              <Route path="/cardapio/:companySlug/:templateSlug" element={<PublicCardapio />} />
              <Route path="/cardapio/:templateId" element={<PublicCardapio />} />
              <Route path="/cardapio" element={<Cardapio />} />
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
