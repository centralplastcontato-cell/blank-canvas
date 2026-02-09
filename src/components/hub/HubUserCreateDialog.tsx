import { useState } from "react";
import { AppRole } from "@/types/crm";
import { Company } from "@/types/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface HubUserCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  onSubmit: (data: { email: string; name: string; password: string; role: AppRole; company_id: string }) => Promise<void>;
}

export function HubUserCreateDialog({ open, onOpenChange, companies, onSubmit }: HubUserCreateDialogProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("gestor");
  const [companyId, setCompanyId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email || !name || !password || !companyId) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({ email, name, password, role, company_id: companyId });
      onOpenChange(false);
      setEmail(""); setName(""); setPassword(""); setRole("gestor"); setCompanyId("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
          <DialogDescription>Preencha os dados e selecione a empresa.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Nome completo</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" /></div>
          <div className="space-y-2"><Label>Senha</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
          <div className="space-y-2">
            <Label>Perfil</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
                <SelectItem value="visualizacao">Visualização</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Usuário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
