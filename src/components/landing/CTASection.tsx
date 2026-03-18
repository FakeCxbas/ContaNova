import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            Empieza a facturar electrónicamente hoy
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Únete a cientos de empresas ecuatorianas que ya simplifican su gestión tributaria con ContaNova.
          </p>
          <Button size="lg" className="text-base px-8 h-12 gap-2" asChild>
            <Link to="/register">Crear cuenta gratis <ArrowRight size={18} /></Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Sin compromiso · Cancela cuando quieras
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
