import { useState, useRef } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Save } from "lucide-react";

export function CompanyDataSection() {
  const { currentCompany, refreshCompanies } = useCompany();

  const [name, setName] = useState(currentCompany?.name || "");
  const [customDomain, setCustomDomain] = useState(currentCompany?.custom_domain || "");
  const [logoUrl, setLogoUrl] = useState(currentCompany?.logo_url || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentCompany) return null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 2MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${currentCompany.id}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(path);

      setLogoUrl(`${publicUrl}?t=${Date.now()}`);
      toast({ title: "Logo enviado!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar logo", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const cleanLogoUrl = logoUrl.split("?")[0];

      const { error } = await supabase
        .from("companies")
        .update({
          name: name.trim(),
          custom_domain: customDomain.trim() || null,
          logo_url: cleanLogoUrl || null,
        })
        .eq("id", currentCompany.id);

      if (error) throw error;

      await refreshCompanies();
      toast({ title: "Dados salvos com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const initials = currentCompany.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6 max-w-lg">
      {/* Logo */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-sm font-medium mb-3 block">Logo da Empresa</Label>
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={logoUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Clique para alterar o logo</p>
              <p className="text-xs">PNG, JPG ou WEBP • Máx. 2MB</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </CardContent>
      </Card>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="company-name">Nome da Empresa</Label>
        <Input
          id="company-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da empresa"
        />
      </div>

      {/* Slug (read-only) */}
      <div className="space-y-2">
        <Label htmlFor="company-slug">Slug</Label>
        <Input
          id="company-slug"
          value={currentCompany.slug}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">Identificador único — não editável.</p>
      </div>

      {/* Custom Domain */}
      <div className="space-y-2">
        <Label htmlFor="company-domain">Domínio Customizado</Label>
        <Input
          id="company-domain"
          value={customDomain}
          onChange={(e) => setCustomDomain(e.target.value)}
          placeholder="exemplo.com.br"
        />
        <p className="text-xs text-muted-foreground">Domínio personalizado para a landing page.</p>
      </div>

      {/* Save */}
      <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Salvar alterações
      </Button>
    </div>
  );
}
