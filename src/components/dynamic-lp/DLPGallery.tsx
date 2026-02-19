import { motion } from "framer-motion";
import { Camera, Star, PartyPopper, Heart } from "lucide-react";
import type { LPGallery, LPTheme } from "@/types/landing-page";

interface DLPGalleryProps {
  gallery: LPGallery;
  theme: LPTheme;
  companyName: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function DLPGallery({ gallery, theme, companyName }: DLPGalleryProps) {
  if (!gallery.enabled || gallery.photos.length === 0) return null;

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Solid background like campaign LP bg-card */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: theme.primary_color + "0a" }}
      />

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ color: theme.text_color, fontFamily: theme.font_heading }}
          >
            Momentos{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Mágicos
            </span>
          </h2>
          <p
            className="text-xl max-w-2xl mx-auto"
            style={{ color: theme.text_color + "99", fontFamily: theme.font_body }}
          >
            {gallery.title}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
        >
          {gallery.photos.map((photo, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative rounded-2xl overflow-hidden shadow-lg cursor-default border"
              style={{
                borderColor: theme.primary_color + "20",
                backgroundColor: theme.background_color,
              }}
            >
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={photo}
                  alt={`${companyName} - Foto ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                {/* Hover overlay gradient */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(to top, ${theme.primary_color}99, transparent 60%)`,
                  }}
                />
                {/* Hover icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Camera className="w-8 h-8 drop-shadow-lg" style={{ color: "#fff" }} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust Badges - pill style like campaign LP */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 flex flex-wrap justify-center items-center gap-4 md:gap-6"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 px-6 py-3 rounded-full shadow-md border"
            style={{
              backgroundColor: theme.secondary_color + "15",
              borderColor: theme.secondary_color + "30",
            }}
          >
            <Star className="w-6 h-6" style={{ color: theme.secondary_color, fill: theme.secondary_color }} />
            <span className="font-bold" style={{ color: theme.text_color, fontFamily: theme.font_body }}>
              4.9/5 no Google
            </span>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 px-6 py-3 rounded-full shadow-md border"
            style={{
              backgroundColor: theme.primary_color + "10",
              borderColor: theme.primary_color + "25",
            }}
          >
            <PartyPopper className="w-6 h-6" style={{ color: theme.primary_color }} />
            <span className="font-bold" style={{ color: theme.text_color, fontFamily: theme.font_body }}>
              +500 festas realizadas
            </span>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 px-6 py-3 rounded-full shadow-md border"
            style={{
              backgroundColor: "#ef444415",
              borderColor: "#ef444430",
            }}
          >
            <Heart className="w-6 h-6" style={{ color: "#ef4444", fill: "#ef4444" }} />
            <span className="font-bold" style={{ color: theme.text_color, fontFamily: theme.font_body }}>
              98% de satisfação
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
