import { useState } from "react";
import { Play } from "lucide-react";
import { motion } from "framer-motion";
import mockupDashboard from "@/assets/mockup-dashboard.png";

interface HubDemoVideoProps {
  youtubeId?: string;
  localVideoUrl?: string;
}

export default function HubDemoVideo({ youtubeId, localVideoUrl }: HubDemoVideoProps) {
  const [playing, setPlaying] = useState(false);
  const hasVideo = !!(youtubeId || localVideoUrl);

  return (
    <section className="py-20 sm:py-28" id="demo">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-[0.2em] mb-4">Demonstração</p>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-foreground leading-tight">
            Veja a plataforma em ação
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
            Em menos de 3 minutos você entende como automatizar seu atendimento e fechar mais festas.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative rounded-2xl overflow-hidden border border-border/50 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.2)]"
        >
          {/* fake browser bar */}
          <div className="flex items-center gap-2 px-4 h-9 bg-muted/60 border-b border-border/40">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
              <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
              <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
            </div>
            <div className="flex-1 max-w-xs mx-auto h-5 rounded bg-muted flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground/50">app.celebrei.com.br/dashboard</span>
            </div>
          </div>

          {playing && youtubeId ? (
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Demonstração Celebrei"
              />
            </div>
          ) : playing && localVideoUrl ? (
            <video
              src={localVideoUrl}
              className="w-full"
              autoPlay
              controls
              playsInline
            />
          ) : (
            <div
              className={`relative w-full ${hasVideo ? "cursor-pointer group" : "cursor-default"}`}
              style={{ paddingBottom: "56.25%" }}
              onClick={() => hasVideo && setPlaying(true)}
            >
              <img
                src={mockupDashboard}
                alt="Dashboard Celebrei"
                className="absolute inset-0 w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

              {/* subtle grid overlay */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
                  backgroundSize: "48px 48px",
                }}
              />

              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <motion.div
                  whileHover={youtubeId ? { scale: 1.08 } : {}}
                  whileTap={youtubeId ? { scale: 0.96 } : {}}
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(0,0,0,0.5)] transition-all duration-300 ${hasVideo ? "bg-primary group-hover:scale-110" : "bg-white/10 border-2 border-white/20"}`}
                >
                  <Play className="h-8 w-8 sm:h-10 sm:w-10 text-white ml-1" />
                </motion.div>
                <p className="text-white/70 text-sm sm:text-base font-medium">
                  {hasVideo ? "Assistir demonstração" : "Vídeo de demonstração em breve"}
                </p>
                {!hasVideo && (
                  <p className="text-white/35 text-xs">Agende uma conversa para ver ao vivo</p>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
