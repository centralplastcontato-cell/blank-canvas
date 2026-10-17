import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { signupStatus } from "@/lib/selfSetup";

/** Páginas onde quem entra cai depois do login */
const LANDING_PATHS = ["/atendimento", "/dashboard"];

/**
 * Buffet que se cadastrou sozinho e ainda não terminou o passo a passo: ao
 * entrar na plataforma, vai direto para /setup.
 */
export function SetupGate() {
  const { currentCompany } = useCompany();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const status = signupStatus(currentCompany?.settings);

  useEffect(() => {
    if (status === "cadastro" && LANDING_PATHS.includes(pathname)) navigate("/setup", { replace: true });
  }, [status, pathname, navigate]);

  return null;
}
