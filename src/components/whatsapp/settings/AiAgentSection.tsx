// A configuração da IA virou páginas em Configurações → Inteligência
// Artificial (pasta ./ai). Este arquivo mantém os nomes antigos.
import { parseBuffetInfo, serializeBuffetInfo } from "@/lib/aiBuffetFields";
import { parseVisitHours, serializeVisitHours } from "@/lib/businessHours";

export { AiOverviewSection as AiAgentSection } from "./ai/AiOverviewSection";
export { parseBuffetInfo, serializeBuffetInfo, parseVisitHours, serializeVisitHours };
