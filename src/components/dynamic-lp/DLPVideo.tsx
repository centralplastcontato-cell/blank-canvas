import { useState } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import type { LPVideo, LPTheme } from "@/types/landing-page";

interface DLPVideoProps {
  video: LPVideo;
  theme: LPTheme;
  companyName: string;
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
  } catch {
    // ignore
  }
  return null;
}

interface VideoItem {
  name: string;
  video_url: string;
  video_type: "youtube" | "upload";
  poster_url?: string;
  location?: string;
}

export function DLPVideo({ video, theme, companyName }: DLPVideoProps) {
  if (!video.enabled) return null;

  // Build video items array: new format (videos[]) or legacy (single video_url)
  let items: VideoItem[] = [];

  if (video.videos && video.videos.length > 0) {
    items = video.videos;
  } else if (video.video_url) {
    items = [
      {
        name: companyName,
        video_url: video.video_url,
        video_type: video.video_type,
        poster_url: (video as any).poster_url,
        location: "Nosso espaço",
      },
    ];
  }

  if (items.length === 0) return null;

  const isMultiple = items.length >= 2;

  return (
    <section className="py-20 relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${theme.background_color} 0%, ${theme.primary_color}08 50%, ${theme.background_color} 100%)`,
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full mb-6 shadow-lg"
            style={{ backgroundColor: theme.secondary_color, color: "#fff" }}
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Play className="w-4 h-4" />
            <span className="text-sm font-medium" style={{ fontFamily: theme.font_body }}>
              Conheça nossos espaços
            </span>
          </motion.div>

          <h2
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{ color: theme.text_color, fontFamily: theme.font_heading }}
          >
            {video.title || (isMultiple ? "Nossas Unidades" : "Conheça Nosso Espaço")}
          </h2>
          <p
            className="text-lg max-w-2xl mx-auto"
            style={{ color: theme.text_color + "99", fontFamily: theme.font_body }}
          >
            Descubra os espaços incríveis onde realizamos festas inesquecíveis para crianças de todas as idades
          </p>
        </motion.div>

        <div
          className={`grid gap-8 max-w-5xl mx-auto ${
            isMultiple ? "md:grid-cols-2" : "md:grid-cols-1 max-w-4xl"
          }`}
        >
          {items.map((item, index) => {
            const embedUrl =
              item.video_type === "youtube"
                ? getYouTubeEmbedUrl(item.video_url)
                : null;

            return (
              <motion.div
                key={index}
                className="group"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <div
                  className="relative rounded-2xl overflow-hidden shadow-xl border-2"
                  style={{
                    borderColor: theme.primary_color + "20",
                    backgroundColor: theme.background_color,
                  }}
                >
                  {embedUrl ? (
                    <div className="aspect-video">
                      <iframe
                        src={embedUrl}
                        title={item.name}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <VideoWithPoster item={item} theme={theme} />
                  )}

                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function VideoWithPoster({ item, theme }: { item: VideoItem; theme: LPTheme }) {
  const [playing, setPlaying] = useState(false);
  const isLogo = item.poster_url?.toLowerCase().endsWith('.png') || item.poster_url?.toLowerCase().endsWith('.svg');

  return (
    <div className="aspect-[9/16] md:aspect-video relative overflow-hidden">
      <video
        src={item.video_url}
        controls
        className="w-full h-full object-cover"
        preload="none"
        playsInline
        aria-label={`Vídeo da ${item.name}`}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      >
        Seu navegador não suporta vídeos.
      </video>
      {item.poster_url && !playing && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          style={{ backgroundColor: isLogo ? (theme.background_color || '#0f0d15') : 'transparent' }}
          onClick={(e) => {
            const video = (e.currentTarget.previousElementSibling as HTMLVideoElement);
            video?.play();
          }}
        >
          <img
            src={item.poster_url}
            alt={item.name}
            className={`w-full h-full ${isLogo ? 'object-contain p-8 md:p-16' : 'object-cover'}`}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <div className="w-0 h-0 border-l-[20px] border-l-white border-y-[12px] border-y-transparent ml-1.5" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
