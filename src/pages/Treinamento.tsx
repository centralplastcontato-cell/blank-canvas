import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
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
import { GraduationCap, Loader2, Play, Video, Download, BookOpen, Clock } from "lucide-react";
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

const CATEGORY_COLORS: Record<string, string> = {
  Geral: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  WhatsApp: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  CRM: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  Agenda: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "Operações": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  "Configurações": "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
  "Inteligência": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "Landing Page": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
};

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

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = lessons.filter((l) => l.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  const openPreview = (lesson: TrainingLesson) => {
    setPreviewUrl(lesson.video_url);
    setPreviewTitle(lesson.title);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 md:p-8 mb-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center shadow-sm">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">Treinamento</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Videoaulas para aprender a usar a plataforma</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleDownloadManual} disabled={generatingPDF} className="shrink-0 gap-2 rounded-xl">
              {generatingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Baixar Manual PDF
            </Button>
          </div>

          {/* Stats row */}
          {lessons.length > 0 && (
            <div className="flex items-center gap-4 mt-5 pt-5 border-t border-primary/10">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span className="font-medium text-foreground">{lessons.length}</span> aulas
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{new Set(lessons.map(l => l.category).filter(Boolean)).size} categorias</span>
              </div>
            </div>
          )}
        </div>

        {/* Category filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
          <button
            onClick={() => setFilterCategory("all")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterCategory === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Todas ({lessons.length})
          </button>
          {CATEGORIES.filter(c => categoryCounts[c] > 0).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat} ({categoryCounts[cat]})
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
            <p className="text-sm text-muted-foreground">Carregando aulas...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center">
              <Video className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">Nenhuma aula disponível</p>
              <p className="text-sm text-muted-foreground mt-1">
                {filterCategory !== "all"
                  ? "Tente selecionar outra categoria."
                  : "As aulas serão publicadas em breve."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {filtered.map((lesson, index) => (
              <div
                key={lesson.id}
                className="group cursor-pointer rounded-2xl border border-border/60 bg-card overflow-hidden hover:shadow-xl hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-300"
                onClick={() => openPreview(lesson)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                  {lesson.thumbnail_url ? (
                    <img src={lesson.thumbnail_url} alt={lesson.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <Play className="h-6 w-6 text-primary/60 ml-0.5" />
                      </div>
                    </div>
                  )}
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all duration-300">
                    <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 shadow-lg">
                      <Play className="h-5 w-5 text-primary ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                  {/* Category badge on thumbnail */}
                  {lesson.category && (
                    <Badge className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 border-0 ${CATEGORY_COLORS[lesson.category] || "bg-muted text-muted-foreground"}`}>
                      {lesson.category}
                    </Badge>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-sm line-clamp-2 text-foreground group-hover:text-primary transition-colors">{lesson.title}</h3>
                  {lesson.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                      {lesson.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Video player dialog */}
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-2xl">
            <div className="p-4 pb-2">
              <h2 className="font-semibold text-lg">{previewTitle}</h2>
            </div>
            <video src={previewUrl || ""} controls autoPlay className="w-full" />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
