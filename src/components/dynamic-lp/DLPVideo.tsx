import { motion } from "framer-motion";
import { Play, MapPin } from "lucide-react";
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
            Nossas{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Unidades
            </span>
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
                    <div className="aspect-[9/16] md:aspect-video relative">
                      <video
                        src={item.video_url}
                        poster={item.poster_url}
                        controls
                        className="w-full h-full object-cover"
                        preload="none"
                        playsInline
                        aria-label={`Vídeo da ${item.name}`}
                      >
                        Seu navegador não suporta vídeos.
                      </video>
                    </div>
                  )}

                  {/* Unit Info Bar */}
                  <div
                    className="p-5"
                    style={{
                      background: `linear-gradient(to top, ${theme.background_color}, ${theme.background_color}dd)`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <h3
                        className="text-xl font-bold"
                        style={{ color: theme.text_color, fontFamily: theme.font_heading }}
                      >
                        {item.name}
                      </h3>
                      {item.location && (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-4 h-4" style={{ color: theme.primary_color }} />
                          <span style={{ color: theme.text_color + "99", fontFamily: theme.font_body }}>
                            {item.location}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
