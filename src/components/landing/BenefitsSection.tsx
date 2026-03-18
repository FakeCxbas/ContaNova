import { FileText, ShieldCheck, BarChart3, Zap } from "lucide-react";

const benefits = [
  {
    icon: FileText,
    title: "Comprobantes electrónicos",
    description: "Facturas, retenciones, notas de crédito y más, validados por el SRI automáticamente.",
  },
  {
    icon: ShieldCheck,
    title: "100% compatible con el SRI",
    description: "Cumple con toda la normativa tributaria ecuatoriana vigente sin complicaciones.",
  },
  {
    icon: BarChart3,
    title: "Reportes en tiempo real",
    description: "Visualiza ingresos, gastos y estado tributario con dashboards intuitivos.",
  },
  {
    icon: Zap,
    title: "Rápido y fácil de usar",
    description: "Interfaz moderna que tu equipo puede dominar en minutos, no en semanas.",
  },
];

const BenefitsSection = () => {
  return (
    <section className="py-20 lg:py-28 bg-cn-gray-50">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            Todo lo que tu negocio necesita
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Simplifica tu gestión contable y tributaria con herramientas diseñadas para PYMEs ecuatorianas.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-cn-blue-50 flex items-center justify-center mb-4">
                <b.icon size={20} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
