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
    <section
      className="py-16 md:py-24"
      style={{
        background: `linear-gradient(to bottom, ${theme.background_color}, ${theme.primary_color}11)`,
      }}
    >
      <div className="max-w-5xl mx-auto px-4">
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
            {testimonials.title} 💬
          </h2>
          <p
            className="text-lg max-w-2xl mx-auto opacity-70"
            style={{ color: theme.text_color, fontFamily: theme.font_body }}
          >
            Milhares de famílias já celebraram momentos especiais conosco!
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
              className="group relative rounded-2xl p-6 shadow-xl border transition-shadow duration-300 hover:shadow-2xl"
              style={{
                backgroundColor: theme.background_color,
                borderColor: theme.primary_color + "22",
              }}
            >
              {/* Quote icon */}
              <div
                className="absolute -top-3 -left-3 w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                style={{ backgroundColor: theme.primary_color }}
              >
                <Quote className="w-5 h-5" style={{ color: theme.text_color }} />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4 pt-2">
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

              {/* Text */}
              <p
                className="mb-6 leading-relaxed opacity-80"
                style={{ color: theme.text_color, fontFamily: theme.font_body }}
              >
                "{item.text}"
              </p>

              {/* Author */}
              <div
                className="flex items-center gap-3 pt-4 border-t"
                style={{ borderColor: theme.primary_color + "22" }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                    color: theme.text_color,
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

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 flex flex-wrap justify-center gap-6 md:gap-12"
        >
          {[
            { value: "+500", label: "Festas realizadas" },
            { value: "4.9", label: "Avaliação média" },
            { value: "98%", label: "Clientes satisfeitos" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p
                className="text-3xl md:text-4xl font-bold"
                style={{ color: theme.primary_color, fontFamily: theme.font_heading }}
              >
                {stat.value}
              </p>
              <p
                className="text-sm opacity-60"
                style={{ color: theme.text_color, fontFamily: theme.font_body }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
