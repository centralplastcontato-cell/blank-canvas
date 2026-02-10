import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import type { LPTheme } from "@/types/landing-page";

interface DLPFloatingCTAProps {
  theme: LPTheme;
  onClick: () => void;
}

export function DLPFloatingCTA({ theme, onClick }: DLPFloatingCTAProps) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2, type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300"
      style={{ backgroundColor: theme.secondary_color, color: theme.text_color }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
        <MessageCircle className="w-7 h-7" />
      </motion.div>
      <span
        className="absolute inset-0 rounded-full animate-ping"
        style={{ backgroundColor: theme.secondary_color + "44" }}
      />
    </motion.button>
  );
}
