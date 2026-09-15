import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-4xl mx-auto rounded-3xl border border-primary/25 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent p-8 sm:p-16 text-center relative overflow-hidden shadow-hero backdrop-blur-md">
          {/* Luz ambiental sutil */}
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-primary/20 rounded-full blur-3xl -z-10" />

          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-5 shadow-2xs">
            <Sparkles size={13} />
            Acceso Rápido y Seguro
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4">
            Comienza a facturar con la velocidad que tu empresa merece
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Mantén el control de cada comprobante, sincroniza tus cobros y entrega una experiencia ágil a tu equipo contable.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="rounded-full text-sm sm:text-base font-semibold px-8 h-12 gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all w-full sm:w-auto" asChild>
              <Link to="/login">
                Iniciar sesión en ContaNova <ArrowRight size={18} />
              </Link>
            </Button>
          </div>
          <p className="text-xs font-medium text-muted-foreground mt-6">
            Cumplimiento SRI garantizado · Facturación en la nube · Control por roles
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
