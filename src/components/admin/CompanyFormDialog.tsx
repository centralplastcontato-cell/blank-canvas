import { useState, useEffect, useRef } from "react";
import { Company } from "@/types/company";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Upload, X, Image } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company | null;
  onSubmit: (data: { name: string; slug: string; is_active: boolean; logo_url: string; custom_domain: string }) => Promise<void>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CompanyFormDialog({ open, onOpenChange, company, onSubmit }: CompanyFormDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!company;

  useEffect(() => {
    if (company) {
      setName(company.name);
      setSlug(company.slug);
      setLogoUrl(company.logo_url || "");
      setCustomDomain(company.custom_domain || "");
      setIsActive(company.is_active);
    } else {
      setName("");
      setSlug("");
      setLogoUrl("");
      setCustomDomain("");
      setIsActive(true);
    }
  }, [company, open]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEditing) {
      setSlug(slugify(value));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem (PNG, JPG, etc).", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const fileName = `${slug || slugify(name) || "logo"}-${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      setLogoUrl(urlData.publicUrl);
      toast({ title: "Logo enviado com sucesso" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), slug: slug.trim(), is_active: isActive, logo_url: logoUrl.trim(), custom_domain: customDomain.trim() });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize os dados da empresa." : "Preencha os dados para criar uma nova empresa."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nome da empresa</Label>
            <Input
              id="company-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Castelo da Diversão"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-slug">Endereço da Página</Label>
            <Input
              id="company-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ex: castelo-da-diversao"
            />
            {slug && (
              <p className="text-xs text-muted-foreground">
                Usado no link: <code className="bg-muted px-1 py-0.5 rounded">celebrei.com/{slug}</code>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Logo da empresa</Label>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <div className="relative h-16 w-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-16 rounded-lg border border-dashed bg-muted/50 flex items-center justify-center shrink-0">
                  <Image className="h-6 w-6 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1.5" />
                  )}
                  {isUploading ? "Enviando..." : "Enviar Logo"}
                </Button>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="Ou cole a URL do logo"
                  className="text-xs h-8"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-domain">Domínio customizado</Label>
            <Input
              id="company-domain"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="ex: castelo.celebrei.com"
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Se preenchido, os links usarão este domínio em vez do padrão.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="company-active">Empresa ativa</Label>
            <Switch
              id="company-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
