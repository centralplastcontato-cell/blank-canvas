import { MapPin, Clock, MessageCircle } from "lucide-react";

export function LocationSection() {
  const mapsQuery = encodeURIComponent("Avenida General Osório, 1442, Trujillo, Sorocaba - SP");

  return (
    <section id="onde-estamos" className="py-16 bg-background">
      <div className="section-container">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Onde estamos</h2>
          <p className="text-muted-foreground">Venha nos visitar e conhecer o Castelo da Diversão</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[hsl(260_30%_15%)] text-white flex items-center justify-center mx-auto mb-4">
              <MapPin size={22} />
            </div>
            <h3 className="font-bold mb-2">Endereço</h3>
            <address className="not-italic text-muted-foreground text-sm leading-relaxed">
              Avenida General Osório, 1442<br />
              Trujillo, Sorocaba/SP
            </address>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[hsl(260_30%_15%)] text-white flex items-center justify-center mx-auto mb-4">
              <Clock size={22} />
            </div>
            <h3 className="font-bold mb-2">Horário de funcionamento</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Segunda a sexta: 9h às 18h<br />
              Sábado: 9h às 13h
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center mx-auto mb-4">
              <MessageCircle size={22} />
            </div>
            <h3 className="font-bold mb-2">WhatsApp</h3>
            <a
              href="https://wa.me/5515974034646"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground text-sm hover:text-primary transition-colors"
            >
              (15) 97403-4646
            </a>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-lg border border-border">
          <iframe
            title="Mapa - Castelo da Diversão"
            src={`https://www.google.com/maps?q=${mapsQuery}&output=embed`}
            width="100%"
            height="400"
            style={{ border: 0, display: "block" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
