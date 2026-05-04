import { motion } from "framer-motion";
import { Star } from "lucide-react";

interface GoogleReviewsSectionProps {
  reviewsUrl?: string;
}

const reviews = [
  {
    name: "Mariana S.",
    text: "Festa perfeita do início ao fim. Equipe atenciosa, espaço lindo e meu filho amou cada minuto!",
  },
  {
    name: "Rafael L.",
    text: "Melhor buffet de Sorocaba. Comida ótima, monitores incríveis e tudo super organizado.",
  },
  {
    name: "Camila R.",
    text: "Já é a segunda festa que fazemos aqui. Família toda elogiou — vale cada centavo.",
  },
];

export function GoogleReviewsSection({
  reviewsUrl = "https://www.google.com/search?q=castelo+da+divers%C3%A3o+sorocaba",
}: GoogleReviewsSectionProps) {
  return (
    <section
      className="relative py-20 md:py-28 overflow-hidden"
      aria-label="O que as famílias dizem"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-background via-purple-50/30 to-background dark:via-purple-950/10" />

      <div className="relative section-container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto"
        >
          {/* Editorial header */}
          <div className="text-center mb-12 md:mb-16">
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-amber-400/60" />
              <span className="inline-flex items-center gap-2 text-[11px] md:text-xs font-semibold tracking-[0.3em] uppercase text-amber-600">
                <svg className="w-3.5 h-3.5" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
                  <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
                  <path fill="#FBBC05" d="M11.69 28.18A13.6 13.6 0 0 1 10.96 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A21.97 21.97 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
                  <path fill="#EA4335" d="M24 9.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 2.96 29.93 1 24 1 15.4 1 7.96 5.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
                </svg>
                Famílias no Google
              </span>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-amber-400/60" />
            </div>
            <h2 className="font-['Fraunces'] text-3xl md:text-5xl font-light text-foreground leading-tight">
              O que as famílias{" "}
              <span className="italic font-medium text-primary">dizem por aí</span>
            </h2>
          </div>

          {/* Quotes grid */}
          <div className="grid md:grid-cols-3 gap-5 md:gap-6">
            {reviews.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative bg-card/80 backdrop-blur-md border border-border/40 rounded-2xl p-6 md:p-7 shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="font-['Fraunces'] text-base md:text-lg text-foreground/85 leading-relaxed font-light italic">
                  "{r.text}"
                </p>
                <p className="font-['Inter'] text-xs font-semibold tracking-wide text-muted-foreground mt-4 uppercase">
                  — {r.name}
                </p>
              </motion.div>
            ))}
          </div>

          {/* CTA link */}
          <div className="flex justify-center mt-10">
            <a
              href={reviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
            >
              Ver todas as avaliações no Google
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
