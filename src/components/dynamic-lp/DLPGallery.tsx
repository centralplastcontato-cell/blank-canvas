import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import type { LPGallery, LPTheme } from "@/types/landing-page";

interface DLPGalleryProps {
  gallery: LPGallery;
  theme: LPTheme;
  companyName: string;
}

export function DLPGallery({ gallery, theme, companyName }: DLPGalleryProps) {
  if (!gallery.enabled || gallery.photos.length === 0) return null;

  return (
    <section className="py-20" style={{ backgroundColor: theme.background_color }}>
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-4"
            style={{ backgroundColor: theme.secondary_color + "22", color: theme.secondary_color }}
          >
            <Camera className="w-4 h-4" />
            <span className="text-sm font-medium" style={{ fontFamily: theme.font_body }}>
              Galeria
            </span>
          </div>
          <h2
            className="text-3xl md:text-4xl font-bold"
            style={{ color: theme.text_color, fontFamily: theme.font_heading }}
          >
            {gallery.title}
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {gallery.photos.map((photo, index) => (
            <motion.div
              key={index}
              className="rounded-xl overflow-hidden shadow-lg aspect-square"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <img
                src={photo}
                alt={`${companyName} - Foto ${index + 1}`}
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
