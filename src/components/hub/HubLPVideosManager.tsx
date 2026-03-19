import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Video, Upload, Loader2, Copy, Trash2, ExternalLink, Film } from "lucide-react";

interface CompanyOption {
  id: string;
  name: string;
  slug: string;
}

interface LPVideoFile {
  name: string;
  url: string;
  path: string;
  created_at: string;
}

export function HubLPVideosManager() {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [videos, setVideos] = useState<LPVideoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) fetchVideos(selectedCompany);
    else setVideos([]);
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from("companies")
      .select("id, name, slug")
      .not("parent_id", "is", null)
      .eq("is_active", true)
      .order("name");
    setCompanies((data || []) as CompanyOption[]);
    setLoading(false);
  };

  const fetchVideos = async (companyId: string) => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from("landing-pages")
      .list(`${companyId}/videos`, { sortBy: { column: "created_at", order: "desc" } });

    if (error) {
      console.error(error);
      setVideos([]);
      setLoading(false);
      return;
    }

    const items: LPVideoFile[] = (data || [])
      .filter((f) => f.name && !f.name.startsWith("."))
      .map((f) => {
        const path = `${companyId}/videos/${f.name}`;
        const { data: urlData } = supabase.storage.from("landing-pages").getPublicUrl(path);
        return {
          name: f.name,
          url: urlData.publicUrl,
          path,
          created_at: f.created_at || "",
        };
      });

    setVideos(items);
    setLoading(false);
  };

  const handleUpload = async (files: FileList) => {
    if (!selectedCompany || !files.length) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "mp4";
        const safeName = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9-_]/g, "-")
          .toLowerCase();
        const path = `${selectedCompany}/videos/${safeName}-${Date.now()}.${ext}`;

        const { error } = await supabase.storage
          .from("landing-pages")
          .upload(path, file, { upsert: true });

        if (error) throw error;
      }

      toast({ title: "Upload concluído!", description: `${files.length} vídeo(s) enviado(s) com sucesso.` });
      fetchVideos(selectedCompany);
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (video: LPVideoFile) => {
    const { error } = await supabase.storage.from("landing-pages").remove([video.path]);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Vídeo excluído" });
    setVideos((prev) => prev.filter((v) => v.path !== video.path));
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "URL copiada!", description: url });
  };

  const selectedName = companies.find((c) => c.id === selectedCompany)?.name;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Selecione uma empresa" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCompany && (
            <Badge variant="secondary">{videos.length} vídeo(s)</Badge>
          )}
        </div>

        {selectedCompany && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.mov,.webm"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
            />
            <Button
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Enviar Vídeo
            </Button>
          </>
        )}
      </div>

      {!selectedCompany ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Film className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Selecione uma empresa para gerenciar os vídeos da Landing Page.</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : videos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Video className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum vídeo enviado para <strong>{selectedName}</strong>.</p>
            <p className="text-xs mt-1">Use o botão "Enviar Vídeo" para fazer upload.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Card key={video.path} className="overflow-hidden">
              <div className="aspect-video bg-black">
                <video
                  src={video.url}
                  controls
                  preload="metadata"
                  className="w-full h-full object-contain"
                />
              </div>
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-medium truncate" title={video.name}>
                  {video.name}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => copyUrl(video.url)}
                  >
                    <Copy className="h-3 w-3 mr-1.5" /> Copiar URL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => window.open(video.url, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    onClick={() => handleDelete(video)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground break-all leading-relaxed">
                  {video.url}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
