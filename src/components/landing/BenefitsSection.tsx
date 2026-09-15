import { FileText, ShieldCheck, BarChart3, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const benefits = [
  {
    icon: FileText,
    title: "Comprobantes electrónicos",
    description: "Facturas, retenciones, notas de crédito y más, validados por el SRI automáticamente.",
    color: "text-blue-600 bg-blue-500/10 ring-blue-500/20",
  },
  {
    icon: ShieldCheck,
    title: "100% compatible SRI",
    description: "Cumple con toda la normativa tributaria ecuatoriana vigente con firma electrónica segura.",
    color: "text-emerald-600 bg-emerald-500/10 ring-emerald-500/20",
  },
  {
    icon: BarChart3,
    title: "Métricas en tiempo real",
    description: "Visualiza ingresos del mes, cobros pendientes y facturas pagadas en dashboards claros.",
    color: "text-indigo-600 bg-indigo-500/10 ring-indigo-500/20",
  },
  {
    icon: Zap,
    title: "Velocidad y agilidad",
    description: "Interfaz reactiva sin fricción para emitir y enviar comprobantes en segundos.",
    color: "text-amber-600 bg-amber-500/10 ring-amber-500/20",
  },
];

const BenefitsSection = () => {
  return (
    <section className="relative py-24 lg:py-32 bg-muted/20 border-y border-border/40 overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <Badge
            variant="outline"
            className="mb-4 rounded-full border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold text-primary"
          >
            Capacidades Diseñadas para Crecer
          </Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
            Todo lo que tu empresa necesita en un solo lugar
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Simplifica tu gestión contable y tributaria con herramientas diseñadas para operar con rapidez y orden total.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="group relative rounded-2xl border border-border/70 bg-card/80 backdrop-blur-md p-6 shadow-card hover:border-primary/40 hover:shadow-card-hover hover:-translate-y-1.5 transition-all duration-300"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ${b.color} mb-5 group-hover:scale-110 transition-transform duration-300`}
              >
                <b.icon size={22} />
              </div>
              <h3 className="font-bold text-base text-foreground mb-2">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
