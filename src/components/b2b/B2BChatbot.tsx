 import { useState, useRef, useEffect } from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import { X, Send, Loader2, Building2 } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import logoPlataforma from "@/assets/logo-plataforma-buffets.png";
 
 interface Message {
   id: string;
   type: "bot" | "user";
   content: string;
   options?: string[];
   isInput?: boolean;
 }
 
 interface B2BLeadData {
   company_name?: string;
   contact_name?: string;
   email?: string;
   phone?: string;
   city?: string;
   state?: string;
   monthly_parties?: string;
   current_tools?: string;
   main_challenges?: string;
   how_found_us?: string;
 }
 
 interface B2BChatbotProps {
   isOpen: boolean;
   onClose: () => void;
 }
 
 const monthlyPartiesOptions = ["1-5", "6-15", "16-30", "30+"];
 const challengesOptions = [
   "Perco leads por falta de follow-up",
   "Não tenho visibilidade do funil",
   "WhatsApp desorganizado",
   "Equipe sem controle",
   "Outro"
 ];
 const currentToolsOptions = [
   "Planilhas (Excel/Google)",
   "WhatsApp pessoal",
   "Outro CRM",
   "Nenhum sistema",
   "Outro"
 ];
 const howFoundOptions = [
   "Google",
   "Instagram",
   "Indicação",
   "LinkedIn",
   "Outro"
 ];
 
 export function B2BChatbot({ isOpen, onClose }: B2BChatbotProps) {
   const [messages, setMessages] = useState<Message[]>([]);
   const [currentStep, setCurrentStep] = useState(0);
   const [leadData, setLeadData] = useState<B2BLeadData>({});
   const [inputValue, setInputValue] = useState("");
   const [inputType, setInputType] = useState<"company_name" | "contact_name" | "email" | "phone" | "city" | null>(null);
   const [isComplete, setIsComplete] = useState(false);
   const [isSaving, setIsSaving] = useState(false);
   const messagesEndRef = useRef<HTMLDivElement>(null);
 
   const scrollToBottom = () => {
     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
   };
 
   useEffect(() => {
     scrollToBottom();
   }, [messages]);
 
   useEffect(() => {
     if (isOpen && messages.length === 0) {
       setTimeout(() => {
         setMessages([
           {
             id: "welcome",
             type: "bot",
             content: "Olá! 👋 Que bom ter você aqui!\n\nSou o assistente da Plataforma para Buffets. Vou te fazer algumas perguntas rápidas para entender como podemos ajudar seu negócio.",
           },
         ]);
         setTimeout(() => {
           setMessages((prev) => [
             ...prev,
             {
               id: "monthly-parties",
               type: "bot",
               content: "Quantas festas seu buffet realiza por mês, em média?",
               options: monthlyPartiesOptions,
             },
           ]);
         }, 800);
       }, 500);
     }
   }, [isOpen, messages.length]);
 
   const handleOptionSelect = (option: string) => {
     const userMessage: Message = {
       id: `user-${Date.now()}`,
       type: "user",
       content: option,
     };
     setMessages((prev) => [...prev, userMessage]);
 
     setTimeout(() => {
       switch (currentStep) {
         case 0: // Monthly parties
           setLeadData((prev) => ({ ...prev, monthly_parties: option }));
           setMessages((prev) => [
             ...prev,
             {
               id: "challenges",
               type: "bot",
               content: "Qual é o maior desafio do seu comercial hoje?",
               options: challengesOptions,
             },
           ]);
           setCurrentStep(1);
           break;
         case 1: // Challenges
           setLeadData((prev) => ({ ...prev, main_challenges: option }));
           setMessages((prev) => [
             ...prev,
             {
               id: "tools",
               type: "bot",
               content: "Qual ferramenta você usa hoje para gerenciar seus leads?",
               options: currentToolsOptions,
             },
           ]);
           setCurrentStep(2);
           break;
         case 2: // Current tools
           setLeadData((prev) => ({ ...prev, current_tools: option }));
           setMessages((prev) => [
             ...prev,
             {
               id: "how-found",
               type: "bot",
               content: "Como você conheceu a nossa plataforma?",
               options: howFoundOptions,
             },
           ]);
           setCurrentStep(3);
           break;
         case 3: // How found
           setLeadData((prev) => ({ ...prev, how_found_us: option }));
           setMessages((prev) => [
             ...prev,
             {
               id: "capture",
               type: "bot",
               content: "Perfeito! 🎯\n\nAgora preciso de alguns dados para agendar sua demonstração gratuita:",
               isInput: true,
             },
           ]);
           setCurrentStep(4);
           setInputType("company_name");
           break;
       }
     }, 500);
   };
 
   const handleInputSubmit = async () => {
     if (!inputValue.trim() || isSaving) return;
 
     const userMessage: Message = {
       id: `user-${Date.now()}`,
       type: "user",
       content: inputValue,
     };
     setMessages((prev) => [...prev, userMessage]);
     const currentValue = inputValue.trim();
     setInputValue("");
 
     switch (inputType) {
       case "company_name":
         setLeadData((prev) => ({ ...prev, company_name: currentValue }));
         setInputType("contact_name");
         break;
       case "contact_name":
         setLeadData((prev) => ({ ...prev, contact_name: currentValue }));
         setInputType("email");
         break;
       case "email":
         // Basic email validation
         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
         if (!emailRegex.test(currentValue)) {
           setMessages((prev) => [
             ...prev,
             {
               id: `error-${Date.now()}`,
               type: "bot",
               content: "Por favor, digite um e-mail válido:",
             },
           ]);
           return;
         }
         setLeadData((prev) => ({ ...prev, email: currentValue }));
         setInputType("phone");
         break;
       case "phone":
         setLeadData((prev) => ({ ...prev, phone: currentValue }));
         setInputType("city");
         break;
       case "city":
         setLeadData((prev) => ({ ...prev, city: currentValue }));
         setInputType(null);
         setIsSaving(true);
 
          try {
            const finalData = {
              ...leadData,
              city: currentValue,
            };

            // Use edge function for secure lead submission with rate limiting
            const { error } = await supabase.functions.invoke('submit-b2b-lead', {
              body: {
                company_name: finalData.company_name || "",
                contact_name: finalData.contact_name || "",
                email: finalData.email || "",
                phone: finalData.phone || null,
                city: finalData.city || null,
                monthly_parties: finalData.monthly_parties ? parseInt(finalData.monthly_parties.replace(/\D/g, "") || "0") : null,
                current_tools: finalData.current_tools || null,
                main_challenges: finalData.main_challenges || null,
                how_found_us: finalData.how_found_us || null,
              },
            });

            if (error) throw error;
 
           setMessages((prev) => [
             ...prev,
             {
               id: "complete",
               type: "bot",
               content: `Excelente, ${finalData.contact_name?.split(" ")[0]}! 🚀\n\nRecebemos sua solicitação. Nossa equipe vai entrar em contato em até 24h para agendar sua demonstração gratuita.\n\nEnquanto isso, fique à vontade para explorar mais sobre a plataforma!`,
             },
           ]);
           setIsComplete(true);
         } catch (error) {
           console.error("Error saving B2B lead:", error);
           toast.error("Erro ao enviar. Tente novamente.");
           setInputType("city");
           setInputValue(currentValue);
         } finally {
           setIsSaving(false);
         }
         break;
     }
   };
 
   const getInputLabel = () => {
     switch (inputType) {
       case "company_name":
         return "Nome do seu buffet:";
       case "contact_name":
         return "Seu nome:";
       case "email":
         return "Seu e-mail:";
       case "phone":
         return "Seu WhatsApp:";
       case "city":
         return "Cidade/Estado:";
       default:
         return "";
     }
   };
 
   const getInputPlaceholder = () => {
     switch (inputType) {
       case "company_name":
         return "Ex: Buffet Alegria Kids";
       case "contact_name":
         return "Seu nome completo";
       case "email":
         return "seuemail@empresa.com";
       case "phone":
         return "(11) 99999-9999";
       case "city":
         return "Ex: Sorocaba - SP";
       default:
         return "";
     }
   };
 
   const resetChat = () => {
     setMessages([]);
     setCurrentStep(0);
     setLeadData({});
     setInputValue("");
     setInputType(null);
     setIsComplete(false);
     setIsSaving(false);
   };
 
   if (!isOpen) return null;
 
   return (
     <AnimatePresence>
       <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0 }}
         className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
         onClick={onClose}
       >
         <motion.div
           initial={{ scale: 0.9, opacity: 0, y: 20 }}
           animate={{ scale: 1, opacity: 1, y: 0 }}
           exit={{ scale: 0.9, opacity: 0, y: 20 }}
           transition={{ type: "spring", damping: 25, stiffness: 300 }}
           className="bg-card rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-border"
           onClick={(e) => e.stopPropagation()}
         >
           {/* Header */}
           <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <img
                 src={logoPlataforma}
                 alt="Plataforma para Buffets"
                 className="h-10 w-10 object-contain rounded-lg bg-white/10 p-1"
               />
               <div>
                 <h3 className="font-display font-bold text-white">Plataforma para Buffets</h3>
                 <p className="text-sm text-white/80">Online agora</p>
               </div>
             </div>
             <button
               onClick={onClose}
               className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
             >
               <X className="w-5 h-5 text-white" />
             </button>
           </div>
 
           {/* Messages */}
           <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
             <AnimatePresence>
               {messages.map((message) => (
                 <motion.div
                   key={message.id}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                 >
                   <div
                     className={`max-w-[85%] rounded-2xl p-4 ${
                       message.type === "user"
                         ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md"
                         : "bg-card text-foreground rounded-bl-md shadow-sm border border-border"
                     }`}
                   >
                     <p className="whitespace-pre-line">{message.content}</p>
                     {message.options && (
                       <div className="mt-3 flex flex-wrap gap-2">
                         {message.options.map((option) => (
                           <button
                             key={option}
                             onClick={() => handleOptionSelect(option)}
                             className="bg-muted hover:bg-primary hover:text-primary-foreground text-foreground px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm border border-border"
                           >
                             {option}
                           </button>
                         ))}
                       </div>
                     )}
                   </div>
                 </motion.div>
               ))}
             </AnimatePresence>
             <div ref={messagesEndRef} />
           </div>
 
           {/* Input Area */}
           {inputType && (
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="p-4 border-t border-border bg-card"
             >
               <p className="text-sm text-muted-foreground mb-2">{getInputLabel()}</p>
               <div className="flex gap-2">
                 <input
                   type={inputType === "email" ? "email" : inputType === "phone" ? "tel" : "text"}
                   value={inputValue}
                   onChange={(e) => setInputValue(e.target.value)}
                   onKeyPress={(e) => e.key === "Enter" && handleInputSubmit()}
                   placeholder={getInputPlaceholder()}
                   className="flex-1 bg-muted border border-border rounded-full px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-base"
                   autoFocus
                 />
                 <button
                   onClick={handleInputSubmit}
                   disabled={isSaving || !inputValue.trim()}
                   className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
                 >
                   {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                 </button>
               </div>
             </motion.div>
           )}
 
           {/* Complete State */}
           {isComplete && (
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="p-4 border-t border-border space-y-3 bg-card"
             >
               <a
                 href="https://wa.me/5515991336278?text=Ol%C3%A1!%20Acabei%20de%20solicitar%20uma%20demo%20da%20plataforma%20para%20buffets."
                 target="_blank"
                 rel="noopener noreferrer"
                 className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-full font-medium transition-colors"
               >
                 <Building2 className="w-5 h-5" />
                 Falar pelo WhatsApp
               </a>
               <button
                 onClick={resetChat}
                 className="w-full bg-muted text-foreground py-3 rounded-full font-medium hover:bg-muted/80 transition-colors"
               >
                 Iniciar nova conversa
               </button>
             </motion.div>
           )}
         </motion.div>
       </motion.div>
     </AnimatePresence>
   );
 }