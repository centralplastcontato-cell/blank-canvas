import { useState, useEffect } from "react";
import { Company } from "@/types/company";
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
import { Loader2 } from "lucide-react";

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company | null;
  onSubmit: (data: { name: string; slug: string; is_active: boolean; logo_url: string }) => Promise<void>;
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
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!company;

  useEffect(() => {
    if (company) {
      setName(company.name);
      setSlug(company.slug);
      setLogoUrl(company.logo_url || "");
      setIsActive(company.is_active);
    } else {
      setName("");
      setSlug("");
      setLogoUrl("");
      setIsActive(true);
    }
  }, [company, open]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEditing) {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), slug: slug.trim(), is_active: isActive, logo_url: logoUrl.trim() });
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
            <Label htmlFor="company-slug">Slug (identificador único)</Label>
            <Input
              id="company-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ex: castelo-da-diversao"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-logo">URL do logo (opcional)</Label>
            <Input
              id="company-logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
            />
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
