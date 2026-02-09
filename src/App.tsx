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
import Users from "./pages/Users";

import LandingPage from "./pages/LandingPage";
import ComercialB2B from "./pages/ComercialB2B";
import ParaBuffets from "./pages/ParaBuffets";
import HubLogin from "./pages/HubLogin";
import HubDashboard from "./pages/HubDashboard";
import HubEmpresas from "./pages/HubEmpresas";
import HubUsers from "./pages/HubUsers";
import HubWhatsApp from "./pages/HubWhatsApp";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CompanyProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/atendimento" element={<CentralAtendimento />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/comercial-b2b" element={<ComercialB2B />} />
            <Route path="/para-buffets" element={<ParaBuffets />} />
            <Route path="/dashboard" element={<Index />} />
            <Route path="/users" element={<Users />} />
            <Route path="/promo" element={<LandingPage />} />
            {/* Hub portal - independent */}
            <Route path="/hub-login" element={<HubLogin />} />
            <Route path="/hub" element={<HubDashboard />} />
            <Route path="/hub/empresas" element={<HubEmpresas />} />
            <Route path="/hub/whatsapp" element={<HubWhatsApp />} />
            <Route path="/hub/users" element={<HubUsers />} />
            {/* Redirects for old routes */}
            <Route path="/admin" element={<Navigate to="/atendimento" replace />} />
            <Route path="/whatsapp" element={<Navigate to="/atendimento" replace />} />
            <Route path="/empresas" element={<Navigate to="/hub/empresas" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </CompanyProvider>
  </QueryClientProvider>
);

export default App;
