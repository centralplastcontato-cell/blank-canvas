import { motion } from "framer-motion";
import { Play } from "lucide-react";
import type { LPVideo, LPTheme } from "@/types/landing-page";

interface DLPVideoProps {
  video: LPVideo;
  theme: LPTheme;
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

export function DLPVideo({ video, theme }: DLPVideoProps) {
  if (!video.enabled || !video.video_url) return null;

  const embedUrl =
    video.video_type === "youtube" ? getYouTubeEmbedUrl(video.video_url) : null;

  return (
    <section className="py-20" style={{ backgroundColor: theme.background_color }}>
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-4"
            style={{ backgroundColor: theme.primary_color + "22", color: theme.primary_color }}
          >
            <Play className="w-4 h-4" />
            <span className="text-sm font-medium" style={{ fontFamily: theme.font_body }}>
              Vídeo
            </span>
          </div>
          <h2
            className="text-3xl md:text-4xl font-bold"
            style={{ color: theme.text_color, fontFamily: theme.font_heading }}
          >
            {video.title}
          </h2>
        </motion.div>

        <motion.div
          className="rounded-2xl overflow-hidden shadow-2xl"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          {embedUrl ? (
            <div className="aspect-video">
              <iframe
                src={embedUrl}
                title={video.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <video
              src={video.video_url}
              controls
              className="w-full aspect-video object-cover"
              preload="none"
              playsInline
            />
          )}
        </motion.div>
      </div>
    </section>
  );
}
