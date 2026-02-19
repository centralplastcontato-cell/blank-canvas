import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import type { LPTestimonials, LPTheme } from "@/types/landing-page";

interface DLPTestimonialsProps {
  testimonials: LPTestimonials;
  theme: LPTheme;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function DLPTestimonials({ testimonials, theme }: DLPTestimonialsProps) {
  if (!testimonials.enabled || testimonials.items.length === 0) return null;

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${theme.background_color} 0%, ${theme.primary_color}08 50%, ${theme.background_color} 100%)`,
        }}
      />

      <div className="max-w-5xl mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: theme.text_color, fontFamily: theme.font_heading }}
          >
            O que nossos clientes dizem 💬
          </h2>
          <p
            className="text-lg max-w-2xl mx-auto"
            style={{ color: theme.text_color + "99", fontFamily: theme.font_body }}
          >
            Milhares de famílias já celebraram momentos especiais conosco. Veja o que elas têm a dizer!
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {testimonials.items.map((item, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className="group relative rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 border"
              style={{
                backgroundColor: theme.background_color,
                borderColor: theme.text_color + "15",
              }}
            >
              {/* Quote icon - floating circle */}
              <div
                className="absolute -top-3 -left-3 w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                style={{ backgroundColor: theme.primary_color }}
              >
                <Quote className="w-5 h-5" style={{ color: "#fff" }} />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4 pt-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5"
                    style={{
                      color: i < item.rating ? "#facc15" : theme.text_color + "33",
                      fill: i < item.rating ? "#facc15" : "none",
                    }}
                  />
                ))}
              </div>

              {/* Text */}
              <p
                className="mb-6 leading-relaxed"
                style={{ color: theme.text_color + "cc", fontFamily: theme.font_body }}
              >
                "{item.text}"
              </p>

              {/* Author */}
              <div
                className="flex items-center gap-3 pt-4 border-t"
                style={{ borderColor: theme.text_color + "15" }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                    color: "#fff",
                  }}
                >
                  {getInitials(item.name)}
                </div>
                <div>
                  <p
                    className="font-semibold"
                    style={{ color: theme.text_color, fontFamily: theme.font_body }}
                  >
                    {item.name}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
