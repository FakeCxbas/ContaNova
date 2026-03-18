import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Básico",
    price: "$12",
    period: "/mes",
    description: "Para emprendedores y negocios pequeños.",
    features: [
      "50 comprobantes/mes",
      "1 usuario",
      "Facturas y notas de crédito",
      "Reportes básicos",
      "Soporte por email",
    ],
    cta: "Comenzar gratis",
    ctaLink: "/register",
    popular: false,
  },
  {
    name: "Profesional",
    price: "$29",
    period: "/mes",
    description: "Para PYMEs en crecimiento.",
    features: [
      "500 comprobantes/mes",
      "5 usuarios",
      "Todos los tipos de comprobantes",
      "Reportes ATS automáticos",
      "Gestión de clientes",
      "Soporte prioritario",
    ],
    cta: "Comenzar gratis",
    ctaLink: "/register",
    popular: true,
  },
  {
    name: "Empresarial",
    price: "$59",
    period: "/mes",
    description: "Para empresas con alto volumen.",
    features: [
      "Comprobantes ilimitados",
      "Usuarios ilimitados",
      "API de integración",
      "Multi-sucursal",
      "Reportes avanzados",
      "Soporte dedicado 24/7",
    ],
    cta: "Contactar ventas",
    ctaLink: "/contacto",
    popular: false,
  },
];

const PricingSection = () => {
  return (
    <section id="precios" className="py-20 lg:py-28">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            Planes para cada etapa de tu negocio
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Elige el plan que se adapte a tus necesidades. Cambia o cancela en cualquier momento.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl p-8 ${
                plan.popular
                  ? "bg-foreground text-primary-foreground ring-2 ring-foreground scale-[1.03]"
                  : "bg-card border border-border shadow-card"
              }`}
            >
              {plan.popular && (
                <div className="text-xs font-medium uppercase tracking-wider text-primary-foreground/70 mb-4">
                  Más popular
                </div>
              )}
              <h3 className={`text-xl font-bold mb-1 ${plan.popular ? "" : "text-foreground"}`}>
                {plan.name}
              </h3>
              <p className={`text-sm mb-6 ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {plan.description}
              </p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                <span className={`text-sm ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {plan.period}
                </span>
              </div>
              <Button
                className={`w-full mb-8 ${
                  plan.popular
                    ? "bg-primary-foreground text-foreground hover:bg-primary-foreground/90"
                    : ""
                }`}
                variant={plan.popular ? "default" : "outline"}
                asChild
              >
                <Link to={plan.ctaLink}>{plan.cta}</Link>
              </Button>
              <ul className="space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <Check size={16} className={plan.popular ? "text-primary-foreground/70" : "text-primary"} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
