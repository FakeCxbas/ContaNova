import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import dashboardMockup from "@/assets/dashboard-mockup.png";

const HeroSection = () => {
  return (
    <section id="inicio" className="pt-32 pb-20 lg:pt-40 lg:pb-32">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cn-blue-50 text-primary text-xs font-medium mb-6">
            🇪🇨 Diseñado para Ecuador
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6">
            Facturación electrónica{" "}
            <span className="text-gradient">simple y poderosa</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Emite comprobantes electrónicos compatibles con el SRI, gestiona tu contabilidad 
            y haz crecer tu negocio. Todo en una sola plataforma.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8 h-12 gap-2" asChild>
              <Link to="/register">Comenzar gratis <ArrowRight size={18} /></Link>
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8 h-12" asChild>
              <Link to="/demo">Ver demostración</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Sin tarjeta de crédito · Configuración en 2 minutos
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="rounded-xl border border-border overflow-hidden shadow-hero">
            <img
              src={dashboardMockup}
              alt="ContaNova - Dashboard de facturación electrónica"
              className="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
