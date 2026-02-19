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
    <section
      className="py-16 md:py-24"
      style={{
        background: `linear-gradient(to bottom, ${theme.primary_color}11, ${theme.background_color})`,
      }}
    >
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full mb-6 shadow-lg"
            style={{
              backgroundColor: theme.secondary_color,
              color: theme.text_color,
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Camera className="w-4 h-4" />
            <span className="text-sm font-medium" style={{ fontFamily: theme.font_body }}>
              Galeria
            </span>
          </motion.div>

          <h2
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{ color: theme.text_color, fontFamily: theme.font_heading }}
          >
            {gallery.title}
          </h2>
          <p
            className="text-lg max-w-2xl mx-auto opacity-70"
            style={{ color: theme.text_color, fontFamily: theme.font_body }}
          >
            Momentos especiais que acontecem no nosso espaço
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {gallery.photos.map((photo, index) => (
            <motion.div
              key={index}
              className="group relative rounded-2xl overflow-hidden shadow-xl border-2 aspect-square"
              style={{ borderColor: theme.primary_color + "15" }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <img
                src={photo}
                alt={`${companyName} - Foto ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              {/* Hover overlay */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(to top, ${theme.primary_color}88, transparent)`,
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
