import { campaignConfig } from "@/config/campaignConfig";
import logoCastelo from "@/assets/logo-castelo.png";
 import { Instagram, Facebook, MessageCircle, MapPin, Building2 } from "lucide-react";
 import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-foreground text-primary-foreground py-12">
      <div className="section-container">
        <div className="text-center">
          <img 
            src={logoCastelo} 
            alt="Castelo da Diversão" 
            className="w-32 md:w-40 mx-auto mb-4"
          />
          <p className="text-primary-foreground/70 mb-6 max-w-md mx-auto">
            Transformando sonhos em festas inesquecíveis há mais de 10 anos.
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 md:gap-8 mb-8">
            <a
              href="https://www.instagram.com/castelodadiversao?igsh=bXFiaHU5dmxjdGsz&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-all duration-300 text-lg"
            >
              <Instagram size={24} className="transition-transform duration-300 group-hover:scale-125 group-hover:rotate-6" />
              <span>Instagram</span>
            </a>
            <a
              href="https://www.facebook.com/share/1G4d6VRmrF/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-all duration-300 text-lg"
            >
              <Facebook size={24} className="transition-transform duration-300 group-hover:scale-125 group-hover:rotate-6" />
              <span>Facebook</span>
            </a>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <a
              href="https://wa.me/5515991336278"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full transition-all duration-300 text-sm font-medium hover:scale-105 hover:shadow-lg"
            >
              <MessageCircle size={18} className="transition-transform duration-300 group-hover:scale-110" />
              <MapPin size={14} />
              <span>WhatsApp Manchester</span>
            </a>
            <a
              href="https://wa.me/5515974034646"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full transition-all duration-300 text-sm font-medium hover:scale-105 hover:shadow-lg"
            >
              <MessageCircle size={18} className="transition-transform duration-300 group-hover:scale-110" />
              <MapPin size={14} />
              <span>WhatsApp Trujilo</span>
            </a>
          </div>

          <div className="border-t border-primary-foreground/20 pt-6">
             <div className="mb-4">
               <Link
                 to="/para-buffets"
                 className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm"
               >
                 <Building2 size={16} />
                 <span>Tem um buffet? Conheça nossa plataforma de gestão</span>
               </Link>
             </div>
            <p className="text-sm text-primary-foreground/50">
              Campanha: {campaignConfig.campaignName}
            </p>
            <p className="text-sm text-primary-foreground/50 mt-1">
              © {new Date().getFullYear()} Castelo da Diversão. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
