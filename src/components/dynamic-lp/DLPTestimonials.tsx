import { motion } from "framer-motion";
import { Star, MessageSquare } from "lucide-react";
import type { LPTestimonials, LPTheme } from "@/types/landing-page";

interface DLPTestimonialsProps {
  testimonials: LPTestimonials;
  theme: LPTheme;
}

export function DLPTestimonials({ testimonials, theme }: DLPTestimonialsProps) {
  if (!testimonials.enabled || testimonials.items.length === 0) return null;

  return (
    <section className="py-20" style={{ backgroundColor: theme.background_color }}>
      <div className="max-w-5xl mx-auto px-4">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-4"
            style={{ backgroundColor: theme.primary_color + "22", color: theme.primary_color }}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm font-medium" style={{ fontFamily: theme.font_body }}>
              Depoimentos
            </span>
          </div>
          <h2
            className="text-3xl md:text-4xl font-bold"
            style={{ color: theme.text_color, fontFamily: theme.font_heading }}
          >
            {testimonials.title}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.items.map((item, index) => (
            <motion.div
              key={index}
              className="p-6 rounded-2xl border shadow-lg"
              style={{
                backgroundColor: theme.background_color,
                borderColor: theme.primary_color + "33",
              }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5"
                    style={{
                      color: i < item.rating ? theme.secondary_color : theme.text_color + "33",
                      fill: i < item.rating ? theme.secondary_color : "none",
                    }}
                  />
                ))}
              </div>
              <p
                className="mb-4 text-sm leading-relaxed opacity-80"
                style={{ color: theme.text_color, fontFamily: theme.font_body }}
              >
                "{item.text}"
              </p>
              <p
                className="font-bold text-sm"
                style={{ color: theme.primary_color, fontFamily: theme.font_body }}
              >
                — {item.name}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
