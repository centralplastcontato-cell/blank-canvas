import { useState } from "react";
import { Play } from "lucide-react";
import { motion } from "framer-motion";
import mockupDashboard from "@/assets/mockup-dashboard.png";
import { SectionHeading } from "./LpSection";

interface HubDemoVideoProps {
  youtubeId?: string;
  localVideoUrl?: string;
  /** Capa do vídeo (no lugar do print do painel) */
  posterUrl?: string;
}

/** Seção própria do vídeo (com título). A página do Hub hoje usa só o player, no topo. */
export default function HubDemoVideo(props: HubDemoVideoProps) {
  return (
    <section className="scroll-mt-16 bg-[#FFF9F3] py-20 sm:py-28" id="demo">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <SectionHeading
          eyebrow="Demonstração"
          title="Veja a plataforma em ação"
          description="Em um minuto e meio você entende como automatizar seu atendimento e fechar mais festas."
          className="mb-10 sm:mb-14"
        />
        <DemoPlayer {...props} />
      </div>
    </section>
  );
}

/** Player do vídeo com moldura de navegador e capa clicável */
export function DemoPlayer({ youtubeId, localVideoUrl, posterUrl }: HubDemoVideoProps) {
  const [playing, setPlaying] = useState(false);
  const hasVideo = !!(youtubeId || localVideoUrl);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, delay: 0.1 }}
      className="relative rounded-3xl overflow-hidden border border-[#0F1222]/[0.08] bg-white shadow-[0_40px_90px_-30px_rgba(15,18,34,0.45)]"
    >
      {/* fake browser bar */}
      <div className="flex items-center gap-2 px-4 h-9 bg-[#F6F3EF] border-b border-[#0F1222]/[0.06]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex-1 max-w-xs mx-auto h-5 rounded-md bg-white flex items-center justify-center">
          <span className="text-[10px] text-slate-400">hubcelebrei.com.br</span>
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
          poster={posterUrl}
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
            src={posterUrl || mockupDashboard}
            alt={posterUrl ? "Vídeo de apresentação do Celebrei" : "Dashboard Celebrei"}
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
          <div className={`absolute inset-0 ${posterUrl ? "bg-black/20" : "bg-black/50 backdrop-blur-[2px]"}`} />

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
              whileHover={hasVideo ? { scale: 1.08 } : {}}
              whileTap={hasVideo ? { scale: 0.96 } : {}}
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(0,0,0,0.5)] transition-all duration-300 ${hasVideo ? "bg-gradient-to-br from-[#FF8A3D] via-[#F0457A] to-[#8E3FD9] group-hover:scale-110" : "bg-white/10 border-2 border-white/20"}`}
            >
              <Play className="h-8 w-8 sm:h-10 sm:w-10 text-white ml-1" />
            </motion.div>
            {!posterUrl && (
              <p className="text-white/70 text-sm sm:text-base font-medium">
                {hasVideo ? "Assistir demonstração" : "Vídeo de demonstração em breve"}
              </p>
            )}
            {!hasVideo && (
              <p className="text-white/35 text-xs">Agende uma conversa para ver ao vivo</p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
