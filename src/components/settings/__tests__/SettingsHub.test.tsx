import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/CompanyContext", () => ({ useCompany: () => ({ currentRole: "owner", currentCompany: { settings: null } }) }));
vi.mock("@/hooks/useCompanyModules", () => ({ useCompanyModules: () => ({ ia_conversacional: true, automations: true, messages: true, advanced: false }) }));
vi.mock("@/hooks/useConfigPermissions", () => ({
  useConfigPermissions: () => ({ isLoading: false, permissions: { connection: true, messages: true, notifications: true, automations: true, advanced: false } }),
}));
const { stub } = vi.hoisted(() => ({ stub: (name: string) => () => <div>conteúdo {name}</div> }));
vi.mock("@/components/admin/ProfileContent", () => ({ ProfileContent: stub("perfil") }));
vi.mock("@/components/admin/PartyControlConfig", () => ({ PartyControlConfig: stub("festa") }));
vi.mock("@/components/admin/UsersManagementPanel", () => ({ UsersManagementPanel: stub("usuarios") }));
vi.mock("@/components/admin/CompanyBackupPanel", () => ({ CompanyBackupPanel: stub("backup") }));
vi.mock("@/components/admin/ActivityLogPanel", () => ({ ActivityLogPanel: stub("auditoria") }));
vi.mock("@/components/whatsapp/settings/CompanyDataSection", () => ({ CompanyDataSection: stub("empresa") }));
vi.mock("@/components/whatsapp/settings/SiteSection", () => ({ SiteSection: stub("site") }));
vi.mock("@/components/whatsapp/settings/ConnectionSection", () => ({ ConnectionSection: stub("conexao") }));
vi.mock("@/components/whatsapp/settings/NotificationsSection", () => ({ NotificationsSection: stub("notificacoes") }));
vi.mock("@/components/whatsapp/settings/MessagesSection", () => ({ MessagesSection: stub("respostas") }));
vi.mock("@/components/whatsapp/settings/SalesMaterialsSection", () => ({ SalesMaterialsSection: stub("materiais") }));
vi.mock("@/components/whatsapp/settings/AiAgentSection", () => ({ AiAgentSection: stub("ia-config") }));
vi.mock("@/components/whatsapp/settings/AiTestSection", () => ({ AiTestSection: stub("ia-teste") }));
vi.mock("@/components/whatsapp/settings/AutomationsSection", () => ({
  AutomationsSection: ({ tabs }: { tabs?: string[] }) => <div>automações {tabs?.join(",")}</div>,
}));
vi.mock("@/components/admin/DataImportSection", () => ({ DataImportSection: stub("importar") }));
vi.mock("@/components/admin/UnitColorManager", () => ({ UnitColorManager: stub("cores") }));

import { SettingsHub } from "../SettingsHub";

const props = { userId: "u1", userEmail: "a@b.c", isAdmin: false, isGestor: false, canManageUsers: true, showOperacoes: true };

describe("SettingsHub", () => {
  it("celular: lista em grupos e abre o item com voltar", () => {
    Element.prototype.scrollIntoView = vi.fn();
    render(<MemoryRouter initialEntries={["/configuracoes"]}><SettingsHub {...props} isMobile /></MemoryRouter>);
    expect(screen.getByText("Meu buffet")).toBeTruthy();
    expect(screen.getByText("Inteligência Artificial")).toBeTruthy();
    // Robô, mensagens automáticas e modelos no mesmo grupo
    expect(screen.getByText("Mensagens e robô")).toBeTruthy();
    expect(screen.queryByText("Robô fixo")).toBeNull();
    expect(screen.queryByText("Importar dados")).toBeNull(); // só administrador
    fireEvent.click(screen.getByText("Configurar a IA"));
    expect(screen.getByText("conteúdo ia-config")).toBeTruthy();
    fireEvent.click(screen.getByText("Configurações"));
    expect(screen.getByText("Mensagens automáticas", { selector: "span" })).toBeTruthy();
  });

  it("links antigos abrem o lugar certo e as abas certas", () => {
    Element.prototype.scrollIntoView = vi.fn();
    render(<MemoryRouter initialEntries={["/configuracoes?secao=content"]}><SettingsHub {...props} isMobile={false} /></MemoryRouter>);
    expect(screen.getByText("conteúdo materiais")).toBeTruthy();
    fireEvent.click(screen.getByText("Robô de atendimento"));
    expect(screen.getByText(/automações geral,perguntas/)).toBeTruthy();
    // O grupo tem dois itens agora: abre o item (o último texto igual ao do grupo)
    const messages = screen.getAllByText("Mensagens automáticas");
    fireEvent.click(messages[messages.length - 1]);
    expect(screen.getByText(/automações visitas,followups/)).toBeTruthy();
    fireEvent.click(screen.getByText("Modelos de mensagem"));
    expect(screen.getByText(/automações festa,gatilhos/)).toBeTruthy();
  });
});
