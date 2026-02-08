import { motion } from "framer-motion";
import { 
  Castle, 
  Gamepad2, 
  UtensilsCrossed, 
  Users, 
  Camera, 
  Award,
  Star,
  PartyPopper,
  Heart
} from "lucide-react";

const benefits = [
  {
    icon: Castle,
    title: "Estrutura Completa",
    description: "Espaço amplo e climatizado com capacidade para até 150 convidados",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: Gamepad2,
    title: "Brinquedos Incríveis",
    description: "Pula-pula, piscina de bolinhas, playground e muito mais diversão",
    color: "from-green-500 to-green-600",
  },
  {
    icon: UtensilsCrossed,
    title: "Buffet Completo",
    description: "Cardápio delicioso para crianças e adultos com opções variadas",
    color: "from-orange-500 to-orange-600",
  },
  {
    icon: Users,
    title: "Monitores Profissionais",
    description: "Equipe treinada para cuidar da diversão e segurança das crianças",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: Camera,
    title: "Espaço Instagramável",
    description: "Cenários decorados perfeitos para fotos memoráveis",
    color: "from-pink-500 to-pink-600",
  },
  {
    icon: Award,
    title: "+10 Anos na Cidade",
    description: "Milhares de festas realizadas com excelência e alegria",
    color: "from-yellow-500 to-yellow-600",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export function BenefitsSection() {
  return (
    <section className="py-20 bg-card">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Por que escolher o <span className="gradient-text">Castelo da Diversão</span>?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Há mais de 10 anos transformando sonhos em realidade com festas inesquecíveis
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {benefits.map((benefit, index) => {
            const IconComponent = benefit.icon;
            return (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                className="relative card-festive p-6 text-center group cursor-default overflow-hidden"
              >
                {/* Background glow effect on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                {/* Icon container */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-5 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
                >
                  <IconComponent className="w-10 h-10 text-white" strokeWidth={1.5} />
                </motion.div>
                
                <h3 className="text-xl font-display font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground relative z-10">
                  {benefit.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 flex flex-wrap justify-center items-center gap-6 md:gap-8"
        >
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border border-yellow-200 dark:border-yellow-700/30 px-6 py-3 rounded-full shadow-sm"
          >
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            <span className="font-bold text-foreground">4.9/5 no Google</span>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 px-6 py-3 rounded-full shadow-sm"
          >
            <PartyPopper className="w-6 h-6 text-primary" />
            <span className="font-bold text-foreground">+5.000 festas realizadas</span>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700/30 px-6 py-3 rounded-full shadow-sm"
          >
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            <span className="font-bold text-foreground">98% de satisfação</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
