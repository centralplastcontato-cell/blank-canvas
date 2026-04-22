import { useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { FileQuestion, ArrowLeft, ClipboardList, UtensilsCrossed, FileText, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PUBLIC_FORM_PREFIXES } from "@/lib/formTypeConfigs";

const FORM_LABEL_MAP: Record<string, { label: string; icon: React.ElementType }> = {
  "/pre-festa": { label: "Pré-Festa", icon: ClipboardList },
  "/prefesta": { label: "Pré-Festa", icon: ClipboardList },
  "/cardapio": { label: "Cardápio", icon: UtensilsCrossed },
  "/contrato": { label: "Dados Complementares", icon: FileText },
  "/dados-complementares": { label: "Dados Complementares", icon: FileText },
  "/avaliacao": { label: "Avaliação", icon: Star },
  "/freelancer": { label: "Freelancer", icon: ClipboardList },
  "/lista-presenca": { label: "Lista de Presença", icon: ClipboardList },
  "/equipe": { label: "Equipe", icon: ClipboardList },
  "/informacoes": { label: "Informações", icon: ClipboardList },
  "/dados-contratante": { label: "Dados do Contratante", icon: FileText },
  "/assinar-contrato": { label: "Assinatura de Contrato", icon: FileText },
  "/escala": { label: "Escala", icon: ClipboardList },
  "/manutencao": { label: "Manutenção", icon: ClipboardList },
  "/acompanhamento": { label: "Acompanhamento", icon: ClipboardList },
  "/festa": { label: "Festa", icon: Star },
};

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const formMatch = useMemo(() => {
    const path = location.pathname.toLowerCase();
    const prefix = PUBLIC_FORM_PREFIXES.find(p => path.startsWith(p));
    if (!prefix) return null;
    return FORM_LABEL_MAP[prefix] || { label: "Formulário", icon: FileText };
  }, [location.pathname]);

  if (formMatch) {
    const IconComp = formMatch.icon;
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10">
            <FileQuestion className="h-10 w-10 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Link inválido
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              O link do formulário de <strong>{formMatch.label}</strong> que você acessou não é válido ou já expirou.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4 text-left space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <IconComp className="h-4 w-4 text-primary" />
              <span>O que pode ter acontecido?</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1.5 pl-6 list-disc">
              <li>O link foi digitado incorretamente</li>
              <li>O formulário foi desativado pela empresa</li>
              <li>O endereço do link está incompleto</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Se o problema persistir, entre em contato com a empresa que enviou este link.
          </p>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
          <FileQuestion className="h-10 w-10 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">404</h1>
          <p className="text-lg text-muted-foreground">
            Página não encontrada
          </p>
          <p className="text-sm text-muted-foreground">
            O endereço que você acessou não existe ou foi removido.
          </p>
        </div>

        <Button asChild variant="default" size="sm" className="gap-2">
          <a href="/">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao início
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
