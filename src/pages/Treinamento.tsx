import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// unused Button removed
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, Loader2, Play, Video, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateManualPDF } from "@/lib/generateManualPDF";

interface TrainingLesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string | null;
  sort_order: number;
}

const CATEGORIES = [
  "Geral",
  "WhatsApp",
  "CRM",
  "Agenda",
  "Operações",
  "Configurações",
  "Inteligência",
  "Landing Page",
];

export default function Treinamento() {
  const [lessons, setLessons] = useState<TrainingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const handleDownloadManual = async () => {
    setGeneratingPDF(true);
    try {
      await generateManualPDF();
    } finally {
      setGeneratingPDF(false);
    }
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("training_lessons")
        .select("id, title, description, video_url, thumbnail_url, category, sort_order")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (data) setLessons(data as TrainingLesson[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = filterCategory === "all"
    ? lessons
    : lessons.filter((l) => l.category === filterCategory);

  const openPreview = (lesson: TrainingLesson) => {
    setPreviewUrl(lesson.video_url);
    setPreviewTitle(lesson.title);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Treinamento</h1>
              <p className="text-sm text-muted-foreground">Videoaulas para aprender a usar a plataforma</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleDownloadManual} disabled={generatingPDF}>
              {generatingPDF ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Baixar Manual
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhuma aula disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((lesson) => (
              <Card
                key={lesson.id}
                className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => openPreview(lesson)}
              >
                <div className="relative aspect-video bg-muted flex items-center justify-center">
                  {lesson.thumbnail_url ? (
                    <img src={lesson.thumbnail_url} alt={lesson.title} className="w-full h-full object-cover" />
                  ) : (
                    <Video className="h-12 w-12 text-muted-foreground/40" />
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-10 w-10 text-white" />
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {lesson.category && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {lesson.category}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2">{lesson.title}</h3>
                  {lesson.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3 mt-1.5">
                      {lesson.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Video player dialog */}
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            <div className="p-4 pb-0">
              <h2 className="font-semibold text-lg">{previewTitle}</h2>
            </div>
            <video src={previewUrl || ""} controls autoPlay className="w-full" />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
