import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CompanyProvider } from "@/contexts/CompanyContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CentralAtendimento from "./pages/CentralAtendimento";
import Configuracoes from "./pages/Configuracoes";
import UserSettings from "./pages/UserSettings";
import Users from "./pages/Users";

import RootPage from "./pages/RootPage";
import LandingPage from "./pages/LandingPage";
import ComercialB2B from "./pages/ComercialB2B";
import ParaBuffets from "./pages/ParaBuffets";
import HubLogin from "./pages/HubLogin";
import HubLandingPage from "./pages/HubLandingPage";
import HubDashboard from "./pages/HubDashboard";
import HubEmpresas from "./pages/HubEmpresas";
import HubUsers from "./pages/HubUsers";
import HubWhatsApp from "./pages/HubWhatsApp";
import HubOnboarding from "./pages/HubOnboarding";
import HubProspeccao from "./pages/HubProspeccao";
import HubAIUsage from "./pages/HubAIUsage";
import HubTreinamento from "./pages/HubTreinamento";
import Treinamento from "./pages/Treinamento";
import Onboarding from "./pages/Onboarding";
import Inteligencia from "./pages/Inteligencia";
import Agenda from "./pages/Agenda";
import Formularios from "./pages/Formularios";
import Avaliacoes from "./pages/Avaliacoes";
import PreFesta from "./pages/PreFesta";

import DynamicLandingPage from "./pages/DynamicLandingPage";
import PublicEvaluation from "./pages/PublicEvaluation";
import PublicPreFesta from "./pages/PublicPreFesta";
import PublicContrato from "./pages/PublicContrato";
import PublicCardapio from "./pages/PublicCardapio";
import PublicStaff from "./pages/PublicStaff";
import PublicMaintenance from "./pages/PublicMaintenance";
import PublicPartyMonitoring from "./pages/PublicPartyMonitoring";
import PublicAttendance from "./pages/PublicAttendance";
import PublicAttendanceReview from "./pages/PublicAttendanceReview";
import PublicEventInfo from "./pages/PublicEventInfo";
import PublicFreelancer from "./pages/PublicFreelancer";
import PublicFreelancerSchedule from "./pages/PublicFreelancerSchedule";
import Contrato from "./pages/Contrato";
import Cardapio from "./pages/Cardapio";
import NotFound from "./pages/NotFound";
import PublicPartyControl from "./pages/PublicPartyControl";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CompanyProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            <Route path="/promo" element={<LandingPage />} />
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
            <Route path="/treinamento" element={<Treinamento />} />
            <Route path="/inteligencia" element={<Inteligencia />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/formularios" element={<Formularios />} />
            <Route path="/avaliacoes" element={<Avaliacoes />} />
            <Route path="/pre-festa" element={<PreFesta />} />
            
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
        </BrowserRouter>
      </TooltipProvider>
    </CompanyProvider>
  </QueryClientProvider>
);

export default App;
