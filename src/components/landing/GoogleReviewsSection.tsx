import { motion } from "framer-motion";
import { Star } from "lucide-react";

interface GoogleReviewsSectionProps {
  rating?: number;
  reviewCount?: number;
  reviewsUrl?: string;
}

const sampleReviews = [
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
  rating = 4.9,
  reviewCount = 850,
  reviewsUrl = "https://www.google.com/search?q=castelo+da+divers%C3%A3o+sorocaba",
}: GoogleReviewsSectionProps) {
  return (
    <section
      className="relative py-16 md:py-24 overflow-hidden"
      aria-label="Avaliações no Google"
    >
      {/* Soft gradient background matching hero palette */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-purple-50/40 to-background dark:via-purple-950/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(50_90%_60%/0.08),transparent_60%)]" />

      <div className="relative section-container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          {/* Hero-style gradient badge */}
          <div className="flex justify-center mb-6">
            <div className="relative inline-flex items-center gap-2.5 bg-gradient-to-r from-purple-500 via-pink-400 to-yellow-400 text-white px-5 py-2.5 rounded-full text-xs md:text-sm font-extrabold shadow-xl tracking-wide uppercase">
              <span className="text-base">⭐</span>
              Famílias avaliam no Google
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/30 via-pink-400/30 to-yellow-400/30 blur-lg -z-10" />
            </div>
          </div>

          {/* Main rating card */}
          <div className="relative bg-card/80 backdrop-blur-md border border-border/40 rounded-3xl p-8 md:p-10 shadow-floating">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
              {/* Big rating */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-3">
                  {/* Google G */}
                  <svg className="w-10 h-10 md:w-12 md:h-12" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
                    <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
                    <path fill="#FBBC05" d="M11.69 28.18A13.6 13.6 0 0 1 10.96 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A21.97 21.97 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
                    <path fill="#EA4335" d="M24 9.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 2.96 29.93 1 24 1 15.4 1 7.96 5.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
                  </svg>
                  <span className="text-5xl md:text-6xl font-extrabold text-foreground tracking-tight">
                    {rating.toFixed(1).replace(".", ",")}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2" aria-label={`Nota ${rating} de 5`}>
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 md:w-6 md:h-6 fill-yellow-400 text-yellow-400 drop-shadow-sm"
                    />
                  ))}
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mt-2 font-medium">
                  baseado em <span className="font-bold text-foreground">+{reviewCount}</span> avaliações reais
                </p>
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px h-24 bg-border/60" />

              {/* Quotes preview */}
              <div className="flex-1 space-y-3 max-w-sm">
                {sampleReviews.slice(0, 2).map((r, i) => (
                  <div
                    key={i}
                    className="text-sm text-foreground/80 leading-relaxed border-l-2 border-secondary/50 pl-3"
                  >
                    <p className="italic">"{r.text}"</p>
                    <p className="text-xs font-semibold text-muted-foreground mt-1">— {r.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA link */}
            <div className="flex justify-center mt-8">
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
          </div>

          {/* Trust line */}
          <p className="text-center text-xs md:text-sm text-muted-foreground mt-6 font-medium">
            9 anos de história · +4.000 festas realizadas · referência em Sorocaba
          </p>
        </motion.div>
      </div>
    </section>
  );
}
