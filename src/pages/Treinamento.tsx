import { useState, useEffect } from "react";
import { getCompanyLogoOverride } from "@/lib/companyAssetOverrides";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useUserRole } from "@/hooks/useUserRole";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PlayCircle, Loader2, Play, Download, Menu, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateManualPDF } from "@/lib/generateManualPDF";
import { cn } from "@/lib/utils";
import { LESSON_CATEGORIES, LESSON_CATEGORY_COLORS, formatLessonDuration, lessonCategory } from "@/lib/lessons";

interface TrainingLesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string | null;
  sort_order: number;
}

/** Capa do vídeo: a imagem cadastrada ou um quadro do próprio vídeo */
function LessonCover({ lesson, duration, onDuration, big }: {
  lesson: TrainingLesson;
  duration: number | undefined;
  onDuration: (seconds: number) => void;
  big?: boolean;
}) {
  const time = formatLessonDuration(duration);
  return (
    <div className="relative aspect-video overflow-hidden bg-muted">
      {lesson.thumbnail_url ? (
        <img src={lesson.thumbnail_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      ) : null}
      <video
        src={`${lesson.video_url}#t=2`}
        preload="metadata"
        muted
        playsInline
        aria-hidden
        onLoadedMetadata={(e) => onDuration(e.currentTarget.duration)}
        className={cn("h-full w-full object-cover", lesson.thumbnail_url && "hidden")}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-black/0 to-black/0" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn(
          "flex items-center justify-center rounded-full bg-white/95 text-primary shadow-lg transition-transform duration-300 group-hover:scale-110",
          big ? "h-16 w-16" : "h-12 w-12",
        )}>
          <Play className={cn("ml-0.5", big ? "h-7 w-7" : "h-5 w-5")} fill="currentColor" />
        </span>
      </div>
      {time && (
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          <Clock className="h-3 w-3" /> {time}
        </span>
      )}
    </div>
  );
}

function CategoryBadge({ category, className }: { category: string; className?: string }) {
  return (
    <Badge className={cn("border-0 px-2 py-0.5 text-[10px] font-semibold", LESSON_CATEGORY_COLORS[category] || "bg-muted text-muted-foreground", className)}>
      {category}
    </Badge>
  );
}

export default function Treinamento() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentCompany } = useCompany();
  const [user, setUser] = useState<{ id: string; name: string; email: string; avatar?: string | null } | null>(null);
  const { isAdmin } = useUserRole(user?.id);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [lessons, setLessons] = useState<TrainingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          id: data.user.id,
          name: data.user.user_metadata?.name || data.user.email?.split("@")[0] || "",
          email: data.user.email || "",
          avatar: data.user.user_metadata?.avatar_url || null,
        });
      }
    });
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("training_lessons")
        .select("id, title, description, video_url, thumbnail_url, category, sort_order")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      setLessons(((data || []) as TrainingLesson[]).map((l) => ({ ...l, category: lessonCategory(l.category) })));
      setLoading(false);
    })();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: "local" });
    navigate("/auth");
  };

  const handleDownloadManual = async () => {
    setGeneratingPDF(true);
    try {
      await generateManualPDF();
    } finally {
      setGeneratingPDF(false);
    }
  };

  // ?aula=<id> abre o vídeo direto (botões "Ver vídeo" das outras telas)
  const playingId = searchParams.get("aula");
  const playing = lessons.find((l) => l.id === playingId) || null;
  const play = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("aula", id); else next.delete("aula");
    setSearchParams(next, { replace: !id });
  };

  const setDuration = (id: string) => (seconds: number) =>
    setDurations((d) => (d[id] === seconds ? d : { ...d, [id]: seconds }));

  const categories = LESSON_CATEGORIES.filter((c) => lessons.some((l) => l.category === c));
  const featured = filterCategory === "all" ? lessons[0] : undefined;
  const list = lessons.filter((l) => l !== featured && (filterCategory === "all" || l.category === filterCategory));

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar
          canManageUsers={!!isAdmin}
          isAdmin={!!isAdmin}
          currentUserName={user?.name || ""}
          onRefresh={() => {}}
          onLogout={handleLogout}
        />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Mobile Header */}
          <header className="bg-card border-b border-border shrink-0 z-10 md:hidden">
            <div className="px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MobileMenu
                    isOpen={isMobileMenuOpen}
                    onOpenChange={setIsMobileMenuOpen}
                    trigger={<Button variant="ghost" size="icon" className="h-9 w-9"><Menu className="w-5 h-5" /></Button>}
                    currentPage="treinamento"
                    userName={user?.name || ""}
                    userEmail={user?.email || ""}
                    userAvatar={user?.avatar}
                    canManageUsers={!!isAdmin}
                    isAdmin={!!isAdmin}
                    onLogout={handleLogout}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    {getCompanyLogoOverride(currentCompany?.slug, currentCompany?.logo_url) && (
                      <img src={getCompanyLogoOverride(currentCompany?.slug, currentCompany?.logo_url)!} alt={currentCompany?.name || "Logo"} className="h-8 w-auto shrink-0" />
                    )}
                    <h1 className="font-display font-bold text-foreground text-sm truncate">Aprenda a usar</h1>
                  </div>
                </div>
                <NotificationBell />
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl px-3 md:px-5 py-3 md:py-4 space-y-5">
              {/* Desktop header (mesmo padrão de Operações e Configurações) */}
              <div className="hidden md:block relative rounded-2xl border border-border/30 bg-gradient-to-r from-card via-card to-primary/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_-20%,hsl(var(--primary)/0.06),transparent)]" />
                <div className="relative flex items-center justify-between gap-4 p-5 md:p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                      <PlayCircle className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">Aprenda a usar</h1>
                      <p className="text-sm text-muted-foreground/70 mt-0.5">Vídeos curtos, passo a passo, para usar a plataforma no dia a dia</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleDownloadManual} disabled={generatingPDF} className="shrink-0 gap-2 text-muted-foreground">
                    {generatingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Manual em PDF
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                  <p className="text-sm text-muted-foreground">Carregando vídeos...</p>
                </div>
              ) : lessons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <PlayCircle className="h-8 w-8 text-primary/70" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Os vídeos estão chegando</p>
                    <p className="text-sm text-muted-foreground mt-1">Enquanto isso, o manual em PDF explica cada parte da plataforma.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadManual} disabled={generatingPDF} className="gap-2 rounded-xl">
                    {generatingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Baixar manual em PDF
                  </Button>
                </div>
              ) : (
                <>
                  {/* Destaque: o primeiro vídeo */}
                  {featured && (
                    <button
                      type="button"
                      onClick={() => play(featured.id)}
                      className="group grid w-full overflow-hidden rounded-2xl border border-border/60 bg-card text-left shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all hover:border-primary/30 hover:shadow-xl md:grid-cols-[1.35fr_1fr]"
                    >
                      <LessonCover lesson={featured} duration={durations[featured.id]} onDuration={setDuration(featured.id)} big />
                      <div className="flex flex-col justify-center gap-3 p-5 md:p-7">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                            <Sparkles className="h-3 w-3" /> Comece por aqui
                          </span>
                          {featured.category && <CategoryBadge category={featured.category} />}
                        </div>
                        <h2 className="text-xl md:text-2xl font-extrabold leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {featured.title}
                        </h2>
                        {featured.description && <p className="text-sm leading-relaxed text-muted-foreground">{featured.description}</p>}
                        <span className="mt-1 inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm">
                          <Play className="h-4 w-4" fill="currentColor" /> Assistir
                          {formatLessonDuration(durations[featured.id]) && <span className="font-normal opacity-80">· {formatLessonDuration(durations[featured.id])}</span>}
                        </span>
                      </div>
                    </button>
                  )}

                  {/* Filtro por assunto (só quando há mais de um) */}
                  {categories.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {["all", ...categories].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setFilterCategory(cat)}
                          className={cn(
                            "shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
                            filterCategory === cat ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80",
                          )}
                        >
                          {cat === "all" ? `Todos (${lessons.length})` : `${cat} (${lessons.filter((l) => l.category === cat).length})`}
                        </button>
                      ))}
                    </div>
                  )}

                  {list.length > 0 && (
                    <section className="space-y-3">
                      {featured && <h2 className="px-1 text-sm font-bold text-foreground">Mais vídeos</h2>}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-5">
                        {list.map((lesson) => (
                          <button
                            type="button"
                            key={lesson.id}
                            onClick={() => play(lesson.id)}
                            className="group overflow-hidden rounded-2xl border border-border/60 bg-card text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-xl"
                          >
                            <LessonCover lesson={lesson} duration={durations[lesson.id]} onDuration={setDuration(lesson.id)} />
                            <div className="space-y-1.5 p-4">
                              {lesson.category && <CategoryBadge category={lesson.category} />}
                              <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{lesson.title}</h3>
                              {lesson.description && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{lesson.description}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Player */}
          <Dialog open={!!playing} onOpenChange={(o) => !o && play(null)}>
            <DialogContent className="max-w-4xl gap-0 overflow-hidden rounded-2xl p-0">
              {playing && (
                <>
                  <video key={playing.id} src={playing.video_url} poster={playing.thumbnail_url || undefined} controls autoPlay playsInline className="aspect-video w-full bg-black" />
                  <div className="space-y-1.5 p-4 md:p-5">
                    {playing.category && <CategoryBadge category={playing.category} />}
                    <DialogTitle className="text-base md:text-lg font-bold leading-snug">{playing.title}</DialogTitle>
                    {playing.description ? (
                      <DialogDescription className="text-sm leading-relaxed">{playing.description}</DialogDescription>
                    ) : (
                      <DialogDescription className="sr-only">Vídeo</DialogDescription>
                    )}
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </SidebarProvider>
  );
}
