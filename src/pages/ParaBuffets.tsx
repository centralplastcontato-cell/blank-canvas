 import { useState } from "react";
 import { Helmet } from "react-helmet-async";
 import { motion } from "framer-motion";
 import { Link } from "react-router-dom";
 import { 
   MessageSquare, 
   BarChart3, 
   Zap, 
   Users, 
   Shield, 
   Smartphone,
   Clock,
   TrendingUp,
   CheckCircle2,
   ArrowRight,
   Star,
   PartyPopper,
   Heart
 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import logoPlataforma from "@/assets/logo-plataforma-buffets.png";
 import { B2BChatbot } from "@/components/b2b/B2BChatbot";
 import { FloatingB2BCTA } from "@/components/b2b/FloatingB2BCTA";
 
 const metrics = [
   { value: "40%", label: "Aumento em conversões", desc: "Média dos clientes nos primeiros 3 meses" },
   { value: "2h", label: "Economizadas por dia", desc: "Tempo ganho com automações" },
   { value: "0", label: "Leads perdidos", desc: "Com notificações em tempo real" },
   { value: "100%", label: "Visibilidade", desc: "Do seu funil de vendas" },
 ];
 
 const features = [
   { icon: MessageSquare, title: "WhatsApp Integrado", desc: "Todas as conversas em um só lugar. Histórico completo, envio de mídia e templates." },
   { icon: BarChart3, title: "CRM Visual Kanban", desc: "Arraste e solte leads entre colunas. Visualize seu funil de vendas em tempo real." },
   { icon: Zap, title: "Landing Pages", desc: "Páginas de campanha profissionais com gatilhos de urgência e contagem regressiva." },
   { icon: Users, title: "Multi-usuário", desc: "Admin, comercial, visualização. Cada colaborador acessa só o que precisa." },
   { icon: Shield, title: "Bot de Qualificação", desc: "Capture nome, unidade, mês e convidados automaticamente. Lead já chega pronto." },
   { icon: Smartphone, title: "100% Responsivo", desc: "Funciona em desktop, tablet e celular. Atenda de qualquer lugar." },
   { icon: Clock, title: "Tempo Real", desc: "Notificações instantâneas. Nunca mais perca uma oportunidade." },
   { icon: TrendingUp, title: "Relatórios", desc: "Dashboard com KPIs: leads, conversões, tempo de resposta e muito mais." },
 ];
 
 const benefits = [
   "Centralize todas as conversas do WhatsApp",
   "Nunca mais perca leads por falta de follow-up",
   "Saiba exatamente quantos leads viraram contrato",
   "Crie campanhas profissionais em minutos",
   "Automatize a qualificação de leads",
   "Acesse de qualquer dispositivo",
 ];
 
 const testimonials = [
   { name: "Maria S.", company: "Buffet Alegria Kids", text: "Aumentamos 40% nas conversões depois que centralizamos o WhatsApp. Antes perdíamos muitos leads.", rating: 5 },
   { name: "João P.", company: "Festa Encantada", text: "O CRM Kanban é fantástico. Consigo ver todo meu funil de vendas de uma vez só.", rating: 5 },
   { name: "Ana C.", company: "Reino da Diversão", text: "A landing page de campanha é muito profissional. Os clientes amam o visual.", rating: 5 },
 ];
 
 export default function ParaBuffets() {
   const [isChatOpen, setIsChatOpen] = useState(false);
 
   return (
     <div className="min-h-screen bg-slate-900">
       <Helmet>
         <title>Plataforma de Gestão para Buffets | CRM + WhatsApp + Landing Pages</title>
         <meta name="description" content="Plataforma completa de gestão comercial para buffets infantis. WhatsApp integrado, CRM visual Kanban e landing pages que convertem. Agende uma demonstração gratuita!" />
         <meta name="keywords" content="plataforma buffet, CRM buffet infantil, gestão buffet, WhatsApp business buffet, software buffet, sistema para buffet" />
         <meta name="robots" content="index, follow" />
         
         <link rel="canonical" href="https://castelodadiversao.online/para-buffets" />
         
         <meta property="og:type" content="website" />
         <meta property="og:url" content="https://castelodadiversao.online/para-buffets" />
         <meta property="og:title" content="Plataforma de Gestão para Buffets Infantis" />
         <meta property="og:description" content="Transforme visitantes em contratos fechados. WhatsApp integrado, CRM visual e landing pages profissionais. Feito por quem entende de buffet." />
         <meta property="og:image" content="https://castelodadiversao.online/og-para-buffets.jpg" />
         <meta property="og:image:width" content="1200" />
         <meta property="og:image:height" content="630" />
         <meta property="og:image:alt" content="Plataforma de Gestão para Buffets - Dashboard, CRM e WhatsApp integrado" />
         <meta property="og:locale" content="pt_BR" />
         <meta property="og:site_name" content="Castelo da Diversão" />
         
         <meta name="twitter:card" content="summary_large_image" />
         <meta name="twitter:url" content="https://castelodadiversao.online/para-buffets" />
         <meta name="twitter:title" content="Plataforma de Gestão para Buffets Infantis" />
         <meta name="twitter:description" content="Transforme visitantes em contratos fechados. WhatsApp integrado, CRM visual e landing pages profissionais." />
         <meta name="twitter:image" content="https://castelodadiversao.online/og-para-buffets.jpg" />
       </Helmet>
 
       {/* Header */}
       <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-lg border-b border-slate-700">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex items-center justify-between h-16">
             <Link to="/" className="flex items-center gap-3">
             <img src={logoPlataforma} alt="Logo" className="h-10 w-10 object-contain" />
               <span className="font-display font-bold text-lg text-white">Plataforma para Buffets</span>
             </Link>
             <a href="#form" className="hidden sm:inline-flex">
               <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0">Solicitar Demo</Button>
             </a>
           </div>
         </div>
       </header>
 
       {/* Hero */}
       <section className="relative py-16 lg:py-24 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
         {/* Animated background elements */}
         <div className="absolute inset-0 overflow-hidden">
           <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
           <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
         </div>
         
         <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid lg:grid-cols-2 gap-12 items-center">
             {/* Left content */}
             <motion.div
               initial={{ opacity: 0, x: -30 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.6 }}
               className="text-left"
             >
               <motion.div
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ delay: 0.2 }}
               >
                 <Badge className="mb-6 text-sm px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
                   🚀 Plataforma desenvolvida dentro de um buffet real
                 </Badge>
               </motion.div>
               
               <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6 leading-tight">
                 Transforme visitantes em{" "}
                 <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                   contratos fechados
                 </span>
               </h1>
               
               <p className="text-xl text-slate-300 mb-8">
                 A plataforma completa de gestão comercial para buffets infantis. 
                 WhatsApp integrado, CRM visual e landing pages que convertem.
               </p>
 
               <div className="flex flex-col sm:flex-row gap-4">
                 <a href="#form">
                   <Button size="lg" className="text-lg px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 shadow-lg shadow-purple-500/25">
                     Quero uma Demonstração
                     <ArrowRight className="ml-2 h-5 w-5" />
                   </Button>
                 </a>
                 <a href="#demo-video">
                   <Button size="lg" variant="outline" className="text-lg px-8 border-slate-500 text-white hover:bg-slate-800">
                     ▶ Assistir Demo
                   </Button>
                 </a>
               </div>
               
               {/* Quick stats */}
               <div className="mt-12 flex items-center gap-8">
                 <div className="text-center">
                   <div className="text-3xl font-bold text-white">+40%</div>
                   <div className="text-sm text-slate-400">Conversões</div>
                 </div>
                 <div className="w-px h-12 bg-slate-600" />
                 <div className="text-center">
                   <div className="text-3xl font-bold text-white">2h</div>
                   <div className="text-sm text-slate-400">Economizadas/dia</div>
                 </div>
                 <div className="w-px h-12 bg-slate-600" />
                 <div className="text-center">
                   <div className="text-3xl font-bold text-white">0</div>
                   <div className="text-sm text-slate-400">Leads perdidos</div>
                 </div>
               </div>
             </motion.div>
             
             {/* Right content - Mockup */}
             <motion.div
               initial={{ opacity: 0, x: 30 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.6, delay: 0.3 }}
               className="relative hidden lg:block"
             >
               {/* Abstract visual element */}
               <div className="relative w-full aspect-square max-w-md mx-auto">
                 {/* Glowing orbs */}
                 <motion.div 
                   className="absolute top-1/4 left-1/4 w-48 h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-xl opacity-60"
                   animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.8, 0.6] }}
                   transition={{ duration: 4, repeat: Infinity }}
                 />
                 <motion.div 
                   className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-xl opacity-50"
                   animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.7, 0.5] }}
                   transition={{ duration: 5, repeat: Infinity }}
                 />
                 
                 {/* Central icon card */}
                 <motion.div
                   className="absolute inset-0 flex items-center justify-center"
                   initial={{ scale: 0.8, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   transition={{ delay: 0.5 }}
                 >
                   <div className="bg-slate-800/80 backdrop-blur-lg border border-slate-700 rounded-3xl p-8 shadow-2xl">
                     <div className="grid grid-cols-2 gap-4">
                       <div className="bg-blue-500/20 rounded-xl p-4 flex flex-col items-center gap-2">
                         <MessageSquare className="w-8 h-8 text-blue-400" />
                         <span className="text-xs text-slate-400">WhatsApp</span>
                       </div>
                       <div className="bg-purple-500/20 rounded-xl p-4 flex flex-col items-center gap-2">
                         <BarChart3 className="w-8 h-8 text-purple-400" />
                         <span className="text-xs text-slate-400">CRM</span>
                       </div>
                       <div className="bg-green-500/20 rounded-xl p-4 flex flex-col items-center gap-2">
                         <Zap className="w-8 h-8 text-green-400" />
                         <span className="text-xs text-slate-400">Automação</span>
                       </div>
                       <div className="bg-pink-500/20 rounded-xl p-4 flex flex-col items-center gap-2">
                         <TrendingUp className="w-8 h-8 text-pink-400" />
                         <span className="text-xs text-slate-400">Relatórios</span>
                       </div>
                     </div>
                     
                     {/* Badge */}
                     <motion.div
                       className="absolute -top-3 -right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg"
                       initial={{ scale: 0 }}
                       animate={{ scale: 1 }}
                       transition={{ delay: 1, type: "spring" }}
                     >
                       ✓ 100% na nuvem
                     </motion.div>
                   </div>
                 </motion.div>
               </div>
             </motion.div>
           </div>
         </div>
       </section>
 
       {/* Metrics Section */}
       <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
             {metrics.map((metric, index) => (
               <motion.div
                 key={index}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: index * 0.1 }}
                 className="text-center text-white"
               >
                 <div className="text-4xl md:text-5xl font-bold mb-2">{metric.value}</div>
                 <div className="text-lg font-semibold opacity-90">{metric.label}</div>
                 <div className="text-sm opacity-70">{metric.desc}</div>
               </motion.div>
             ))}
           </div>
         </div>
       </section>
 
       {/* Video Demo Section */}
       {/* Problem Section */}
       <section className="py-20 bg-slate-900">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="text-center mb-12"
           >
             <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
               Você se identifica com isso?
             </h2>
           </motion.div>
 
           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
             {[
               "Leads chegam pelo WhatsApp e se perdem na bagunça",
               "Cada vendedor usa o próprio celular",
               "Não sabe quantos leads viraram contrato",
               "Promoções divulgadas de forma amadora",
               "Zero visibilidade de métricas",
               "Clientes não recebem follow-up",
             ].map((problem, index) => (
               <motion.div
                 key={index}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: index * 0.1 }}
                 className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30"
               >
                 <span className="text-red-500 font-bold text-lg">✗</span>
                 <span className="text-slate-300">{problem}</span>
               </motion.div>
             ))}
           </div>
         </div>
       </section>
 
       {/* Features */}
       <section id="features" className="py-20 bg-slate-800">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="text-center mb-16"
           >
             <Badge className="mb-4 bg-slate-700 text-slate-300 border-slate-600">Funcionalidades</Badge>
             <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
               Tudo que você precisa em um só lugar
             </h2>
             <p className="text-xl text-slate-400 max-w-2xl mx-auto">
               Desenvolvido por quem entende as dores de um buffet
             </p>
           </motion.div>
 
           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
             {features.map((feature, index) => (
               <motion.div
                 key={index}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: index * 0.1 }}
               >
                 <Card className="h-full bg-slate-900 border-slate-700 hover:border-blue-500/50 transition-colors">
                   <CardHeader>
                     <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                       <feature.icon className="h-6 w-6 text-blue-400" />
                     </div>
                     <CardTitle className="text-lg text-white">{feature.title}</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <p className="text-sm text-slate-400">{feature.desc}</p>
                   </CardContent>
                 </Card>
               </motion.div>
             ))}
           </div>
         </div>
       </section>
 
       {/* Benefits */}
       <section className="py-20 bg-primary text-primary-foreground">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid lg:grid-cols-2 gap-12 items-center">
             <motion.div
               initial={{ opacity: 0, x: -20 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
             >
               <h2 className="text-3xl md:text-4xl font-display font-bold mb-8">
                 Por que escolher nossa plataforma?
               </h2>
               <ul className="space-y-4">
                 {benefits.map((benefit, index) => (
                   <li key={index} className="flex items-center gap-3">
                     <CheckCircle2 className="h-6 w-6 text-secondary shrink-0" />
                     <span className="text-lg">{benefit}</span>
                   </li>
                 ))}
               </ul>
             </motion.div>
 
             <motion.div
               initial={{ opacity: 0, x: 20 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               className="bg-white/10 backdrop-blur-lg rounded-3xl p-8"
             >
               <h3 className="text-2xl font-bold mb-6">Prova Social</h3>
               <div className="grid grid-cols-3 gap-6 text-center">
                 <div>
                   <div className="flex items-center justify-center gap-1 mb-2">
                     <Star className="h-6 w-6 fill-secondary text-secondary" />
                     <span className="text-3xl font-bold">4.9</span>
                   </div>
                   <p className="text-sm opacity-80">no Google</p>
                 </div>
                 <div>
                   <div className="flex items-center justify-center gap-1 mb-2">
                     <PartyPopper className="h-6 w-6" />
                     <span className="text-3xl font-bold">5k+</span>
                   </div>
                   <p className="text-sm opacity-80">festas</p>
                 </div>
                 <div>
                   <div className="flex items-center justify-center gap-1 mb-2">
                     <Heart className="h-6 w-6 fill-secondary text-secondary" />
                     <span className="text-3xl font-bold">98%</span>
                   </div>
                   <p className="text-sm opacity-80">satisfação</p>
                 </div>
               </div>
             </motion.div>
           </div>
         </div>
       </section>
 
       {/* Testimonials */}
       <section className="py-20 bg-slate-900">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="text-center mb-12"
           >
             <Badge className="mb-4 bg-slate-800 text-slate-300 border-slate-700">Depoimentos</Badge>
             <h2 className="text-3xl md:text-4xl font-display font-bold text-white">
               O que nossos clientes dizem
             </h2>
           </motion.div>
 
           <div className="grid md:grid-cols-3 gap-6">
             {testimonials.map((testimonial, index) => (
               <motion.div
                 key={index}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: index * 0.1 }}
               >
                 <Card className="h-full bg-slate-800 border-slate-700">
                   <CardContent className="pt-6">
                     <div className="flex gap-1 mb-4">
                       {[...Array(testimonial.rating)].map((_, i) => (
                         <Star key={i} className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                       ))}
                     </div>
                     <p className="text-slate-400 mb-4">"{testimonial.text}"</p>
                     <div>
                       <p className="font-semibold text-white">{testimonial.name}</p>
                       <p className="text-sm text-slate-500">{testimonial.company}</p>
                     </div>
                   </CardContent>
                 </Card>
               </motion.div>
             ))}
           </div>
         </div>
       </section>
 
       {/* Form Section */}
       <section id="form" className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
         {/* Background elements */}
         <div className="absolute inset-0 overflow-hidden">
           <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
           <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
         </div>
         
         <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
           >
             <Badge className="mb-6 bg-white/10 text-white border-white/20">Demonstração Gratuita</Badge>
             <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
               Pronto para transformar seu comercial?
             </h2>
             <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
               Agende uma demonstração gratuita de 15 minutos e veja como a plataforma 
               pode aumentar suas conversões em até 40%.
             </p>
             
             <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
               <Button 
                 size="lg" 
                 onClick={() => setIsChatOpen(true)}
                 className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 shadow-lg shadow-purple-500/25"
               >
                 <Zap className="mr-2 h-5 w-5" />
                 Solicitar Demo Agora
               </Button>
               <a 
                 href="https://wa.me/5515991336278?text=Ol%C3%A1!%20Vi%20a%20plataforma%20para%20buffets%20e%20gostaria%20de%20saber%20mais."
                 target="_blank"
                 rel="noopener noreferrer"
               >
                 <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-white/30 text-white hover:bg-white/10 w-full sm:w-auto">
                   <MessageSquare className="mr-2 h-5 w-5" />
                   Falar pelo WhatsApp
                 </Button>
               </a>
             </div>
             
             {/* Trust badges */}
             <div className="flex flex-wrap justify-center gap-8 text-white/70">
               <div className="flex items-center gap-2">
                 <Clock className="h-5 w-5" />
                 <span>Demo de 15 min</span>
               </div>
               <div className="flex items-center gap-2">
                 <Shield className="h-5 w-5" />
                 <span>Sem compromisso</span>
               </div>
               <div className="flex items-center gap-2">
                 <Users className="h-5 w-5" />
                 <span>Equipe especializada</span>
               </div>
             </div>
           </motion.div>
         </div>
       </section>
 
       {/* Footer */}
       <footer className="py-12 bg-slate-950 text-white border-t border-slate-800">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-3">
             <img src={logoPlataforma} alt="Logo" className="h-10 w-10 object-contain" />
               <span className="font-display font-bold">Plataforma para Buffets</span>
             </div>
             <p className="text-sm text-slate-500">
               © {new Date().getFullYear()} Todos os direitos reservados.
             </p>
             <Link to="/" className="text-sm text-slate-500 hover:text-white transition-colors">
               Voltar ao site principal
             </Link>
           </div>
         </div>
       </footer>

       {/* Floating CTA & Chatbot */}
       <FloatingB2BCTA onClick={() => setIsChatOpen(true)} />
       <B2BChatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
     </div>
   );
 }