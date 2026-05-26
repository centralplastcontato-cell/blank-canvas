import { motion } from "framer-motion";
import { Star } from "lucide-react";

interface GoogleReviewsSectionProps {
  reviewsUrl?: string;
}

const reviews = [
  {
    name: "Mariana S.",
    avatar: "M",
    color: "#E91E63",
    text: "Recebemos os convidados num espaço impecável. Meu filho ainda fala da festa dele meses depois.",
  },
  {
    name: "Rafael L.",
    avatar: "R",
    color: "#FF5722",
    text: "Atenção aos detalhes do começo ao fim. Equipe leve, comida elogiada e festa fluindo sem nenhum perrengue.",
  },
  {
    name: "Camila R.",
    avatar: "C",
    color: "#9C27B0",
    text: "Voltamos pela terceira vez. É raro encontrar um lugar que entrega o que promete — aqui entrega mais.",
  },
];

export function GoogleReviewsSection({
  reviewsUrl = "https://www.google.com/search?q=castelo+da+divers%C3%A3o+sorocaba",
}: GoogleReviewsSectionProps) {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-b from-white to-pink-50/40">
      {/* Decoração de fundo */}
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ backgroundColor: "#E91E63" }} />
      <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ backgroundColor: "#FFC107" }} />

      <div className="relative section-container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            {/* Google badge */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 bg-white rounded-full px-4 py-2 shadow-md border border-gray-100">
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
                  <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
                  <path fill="#FBBC05" d="M11.69 28.18A13.6 13.6 0 0 1 10.96 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A21.97 21.97 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
                  <path fill="#EA4335" d="M24 9.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 2.96 29.93 1 24 1 15.4 1 7.96 5.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
                </svg>
                <span className="text-xs font-bold text-gray-600 tracking-wide">4,7 · Reputação verificada</span>
                <div className="flex gap-0.5 ml-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
            </div>

            <h2 className="font-['Nunito'] text-3xl md:text-5xl font-extrabold text-gray-800 leading-tight mb-3">
              Quem celebra aqui{" "}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #E91E63, #FF5722)" }}>
                volta — e indica
              </span>
            </h2>
            <p className="font-['Nunito'] text-lg text-gray-500 max-w-xl mx-auto">
              Mais de 4.000 famílias já confiaram ao Castelo o momento mais especial do ano
            </p>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-5 md:gap-6">
            {reviews.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="relative bg-white rounded-3xl p-6 md:p-7 shadow-md hover:shadow-xl transition-all border border-gray-100 overflow-hidden"
              >
                {/* Acento colorido no topo */}
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{ backgroundColor: r.color }} />

                {/* Avatar + estrelas */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md"
                    style={{ backgroundColor: r.color }}>
                    {r.avatar}
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>

                <p className="font-['Nunito'] text-base md:text-lg text-gray-700 leading-relaxed italic mb-4">
                  "{r.text}"
                </p>
                <p className="font-['Nunito'] text-xs font-bold tracking-widest text-gray-400 uppercase">
                  — {r.name}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Link Google */}
          <div className="flex justify-center mt-10">
            <a
              href={reviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-['Nunito'] inline-flex items-center gap-2 text-sm font-bold text-pink-500 hover:text-pink-600 transition-colors underline-offset-4 hover:underline"
            >
              Ver todas as avaliações no Google →
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
