import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

interface FloatingCTAProps {
  onClick: () => void;
}

export function FloatingCTA({ onClick }: FloatingCTAProps) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2, type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 bg-gradient-cta text-primary-foreground p-4 rounded-full shadow-floating hover:scale-110 transition-transform duration-300 flex items-center gap-3 group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <MessageCircle className="w-7 h-7" />
      </motion.div>
      <span className="hidden sm:inline font-bold text-lg pr-2">Falar Agora</span>
      
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
    </motion.button>
  );
}
