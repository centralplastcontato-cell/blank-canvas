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
import UserSettings from "./pages/UserSettings";
import LandingPage from "./pages/LandingPage";
import ComercialB2B from "./pages/ComercialB2B";
import ParaBuffets from "./pages/ParaBuffets";
import Empresas from "./pages/Empresas";
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
            <Route path="/empresas" element={<Empresas />} />
            <Route path="/promo" element={<LandingPage />} />
            {/* Redirects for old routes */}
            <Route path="/admin" element={<Navigate to="/atendimento" replace />} />
            <Route path="/whatsapp" element={<Navigate to="/atendimento" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </CompanyProvider>
  </QueryClientProvider>
);

export default App;
