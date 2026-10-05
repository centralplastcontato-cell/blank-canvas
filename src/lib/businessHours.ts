// Mesmas regras de horário (visitas e equipe) usadas pela IA na edge function.
export {
  parseVisitHours,
  serializeTeamHours,
  serializeVisitHours,
  type ParsedHours,
} from "../../supabase/functions/_shared/business-hours.ts";
