import { useState } from "react";
import { BookOpen, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HubLayout } from "@/components/hub/HubLayout";
import { FEATURE_CATEGORIES, generateFeaturesPDF } from "@/lib/generateFeaturesPDF";
import { toast } from "sonner";

const categoryColors: Record<string, string> = {
  "CRM & Vendas": "bg-primary/10 text-primary",
  "WhatsApp & Automações": "bg-accent/10 text-accent",
  "Agenda & Eventos": "bg-secondary/10 text-secondary-foreground",
  "Operações & Formulários": "bg-festive/10 text-festive",
  "Contratos & Financeiro": "bg-castle/10 text-castle",
  "Inteligência & IA": "bg-primary/10 text-primary",
  "Portal Hub": "bg-accent/10 text-accent",
  "Interfaces Públicas": "bg-secondary/10 text-secondary-foreground",
  "Campanhas & Marketing": "bg-festive/10 text-festive",
};

export default function HubFuncionalidades() {
  const [isGenerating, setIsGenerating] = useState(false);

  const totalFeatures = FEATURE_CATEGORIES.reduce((s, c) => s + c.features.length, 0);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      await generateFeaturesPDF();
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <HubLayout
      currentPage="funcionalidades"
      header={
        <div className="flex items-center gap-3 flex-1">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Funcionalidades</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {FEATURE_CATEGORIES.length} categorias • {totalFeatures} funcionalidades
            </p>
          </div>
          <div className="ml-auto">
            <Button onClick={handleDownloadPDF} disabled={isGenerating} size="sm">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Baixar PDF
            </Button>
          </div>
        </div>
      }
    >
      {() => (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-none bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{totalFeatures}</p>
                <p className="text-xs text-muted-foreground">Funcionalidades</p>
              </CardContent>
            </Card>
            <Card className="border-none bg-gradient-to-br from-accent/5 to-accent/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-accent">{FEATURE_CATEGORIES.length}</p>
                <p className="text-xs text-muted-foreground">Categorias</p>
              </CardContent>
            </Card>
            <Card className="border-none bg-gradient-to-br from-secondary/5 to-secondary/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-secondary-foreground">100%</p>
                <p className="text-xs text-muted-foreground">Incluso no Plano</p>
              </CardContent>
            </Card>
            <Card className="border-none bg-gradient-to-br from-festive/5 to-festive/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-festive">24/7</p>
                <p className="text-xs text-muted-foreground">Disponível</p>
              </CardContent>
            </Card>
          </div>

          {/* Category cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {FEATURE_CATEGORIES.map((cat) => (
              <Card key={cat.title} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{cat.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">{cat.features.length} itens</p>
                    </div>
                    <Badge variant="secondary" className={categoryColors[cat.title] || "bg-muted text-muted-foreground"}>
                      {cat.features.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2.5">
                    {cat.features.map((feat) => (
                      <li key={feat.name} className="flex gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-tight">{feat.name}</p>
                          <p className="text-xs text-muted-foreground leading-snug">{feat.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </HubLayout>
  );
}
