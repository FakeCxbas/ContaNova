import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const features = [
  "Emisión masiva de facturas electrónicas",
  "Anulación y reenvío automático de comprobantes",
  "Gestión ágil de clientes y proveedores",
  "Retenciones y notas de crédito/débito",
  "Guías de remisión electrónicas normadas",
  "Liquidaciones de compras inmediatas",
  "Reportes ATS automáticos listos para declarar",
  "Exportación con un clic a Excel y PDF",
  "Acceso multi-usuario con roles granulares",
  "Soporte técnico preferente en Ecuador",
  "Integración con catálogo de productos y stock",
  "Respaldo cifrado continuo en la nube",
];

const FeaturesSection = () => {
  return (
    <section id="funciones" className="py-24 lg:py-32 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-5">
              <Badge
                variant="outline"
                className="mb-4 rounded-full border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold text-primary"
              >
                Control Total
              </Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
                Funcionalidades que{" "}
                <span className="text-gradient">impulsan tu negocio</span>
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg mb-8 leading-relaxed">
                ContaNova integra todo lo necesario para cumplir con el SRI sin dolores de cabeza,
                automatizando comprobantes, cobros y reportes contables desde un entorno centralizado.
              </p>

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Actualizaciones Normativas Continuas</p>
                  <p className="text-xs text-muted-foreground">Tu sistema siempre al día con los cambios del SRI en Ecuador.</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-primary/30 hover:bg-card hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 shrink-0">
                    <Check size={13} strokeWidth={2.5} />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-foreground">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
