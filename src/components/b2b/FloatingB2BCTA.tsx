 import { motion } from "framer-motion";
 import { MessageCircle } from "lucide-react";
 
 interface FloatingB2BCTAProps {
   onClick: () => void;
 }
 
 export function FloatingB2BCTA({ onClick }: FloatingB2BCTAProps) {
   return (
     <motion.button
       initial={{ scale: 0, opacity: 0 }}
       animate={{ scale: 1, opacity: 1 }}
       transition={{ delay: 2, type: "spring", stiffness: 300, damping: 20 }}
       onClick={onClick}
       className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 flex items-center gap-3 group"
       whileHover={{ scale: 1.05 }}
       whileTap={{ scale: 0.95 }}
     >
       <motion.div
         animate={{ scale: [1, 1.15, 1] }}
         transition={{ duration: 2, repeat: Infinity }}
       >
         <MessageCircle className="w-7 h-7" />
       </motion.div>
       <span className="hidden sm:inline font-bold text-lg pr-2">Solicitar Demo</span>
       
       {/* Pulse ring */}
       <span className="absolute inset-0 rounded-full bg-purple-400/40 animate-ping" />
     </motion.button>
   );
 }