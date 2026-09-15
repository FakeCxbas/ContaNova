import { useMemo, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const whatsappLink = "https://wa.me/593998134331?text=Hola%2C%20quiero%20una%20cotizacion%20para%20ContaNova.";

const billingOptions = {
  mensual: {
    label: "Mensual",
    rate: 0.33,
    helper: "$0.33 por factura",
    note: "Pagas una bolsa mensual clara, sin costo de instalacion.",
  },
  anual: {
    label: "Anual",
    rate: 0.30,
    helper: "$0.30 por factura",
    note: "Pagas el ano completo y bajas un poco mas el costo por factura.",
  },
} as const;

type BillingMode = keyof typeof billingOptions;

const plans = [
  {
    name: "Inicio",
    invoices: 30,
    description: "Para negocios que apenas arrancan y necesitan una operación limpia desde el primer día.",
    features: [
      "30 facturas al mes",
      "1 usuario administrador",
      "Clientes y productos",
      "PDF comercial y control básico",
    ],
    popular: false,
  },
  {
    name: "Operación",
    invoices: 100,
    description: "El punto ideal para empresas que ya facturan de forma constante y quieren velocidad.",
    features: [
      "100 facturas al mes",
      "Múltiples usuarios",
      "Panel de cobros y evidencias",
      "Reportes y seguimiento operativo",
    ],
    popular: true,
  },
  {
    name: "Crecimiento",
    invoices: 300,
    description: "Pensado para equipos con mayor volumen, varias áreas y necesidad de control continuo.",
    features: [
      "300 facturas al mes",
      "Usuarios ampliados",
      "Configuración empresarial",
      "Soporte prioritario",
    ],
    popular: false,
  },
];

const formatUsd = (value: number) =>
  new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);

const PricingSection = () => {
  const [billingMode, setBillingMode] = useState<BillingMode>("mensual");
  const billing = billingOptions[billingMode];

  const customPlanText = useMemo(() => {
    return billingMode === "mensual"
      ? "Si tu operación cambia mes a mes, te cotizamos una bolsa flexible de facturas y usuarios."
      : "Si quieres mejor costo por factura y una implementación más estable, armamos una propuesta anual contigo.";
  }, [billingMode]);

  return (
    <section id="precios" className="relative overflow-hidden py-24 lg:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_35%),linear-gradient(180deg,transparent,rgba(255,255,255,0.03))]" />
      <div className="container relative mx-auto px-4 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <Badge
            variant="outline"
            className="mb-5 rounded-full border-primary/20 bg-primary/5 px-4 py-1 text-[11px] uppercase tracking-[0.22em] text-primary"
          >
            Planes y cotizaciones
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-foreground md:text-5xl">
            Facturacion electronica simple desde $0.33 por factura
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            ContaNova se cotiza por volumen para que pagues segun tu operacion real. Puedes trabajar mes a mes
            o bajar el costo por factura con una propuesta anual.
          </p>

          <div className="mx-auto mt-8 inline-flex rounded-full border border-border/80 bg-muted/50 p-1.5 shadow-sm">
            {(Object.keys(billingOptions) as BillingMode[]).map((option) => {
              const current = billingOptions[option];
              const active = billingMode === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setBillingMode(option)}
                  className={[
                    "rounded-full px-6 py-2 text-xs sm:text-sm font-semibold transition-all duration-200",
                    active
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {current.label}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{billing.helper}</span> · {billing.note}
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_1fr_1fr_0.92fr]">
          {plans.map((plan) => {
            const monthlyPrice = plan.invoices * billing.rate;
            const annualPrice = monthlyPrice * 12;
            const displayPrice = billingMode === "mensual" ? monthlyPrice : annualPrice;
            const displaySuffix = billingMode === "mensual" ? "/mes" : "/ano";

            return (
              <article
                key={plan.name}
                className={[
                  "group relative overflow-hidden rounded-3xl border bg-card/90 backdrop-blur-md p-8 shadow-card transition-all duration-300",
                  "hover:-translate-y-1 hover:shadow-card-hover",
                  plan.popular
                    ? "border-primary/50 ring-2 ring-primary/20 lg:-translate-y-2 shadow-xl shadow-primary/10"
                    : "border-border/70 hover:border-primary/30",
                ].join(" ")}
              >
                <div
                  className={[
                    "absolute inset-0 pointer-events-none opacity-40",
                    plan.popular
                      ? "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent"
                      : "bg-transparent",
                  ].join(" ")}
                />

                <div className="relative">
                  {plan.popular && (
                    <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary shadow-sm shadow-primary/15">
                      <Sparkles className="h-3.5 w-3.5" />
                      Más elegido
                    </div>
                  )}

                  <h3 className="text-3xl font-black tracking-tight text-foreground">{plan.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{plan.description}</p>

                  <div className="mt-7">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Capacidad incluida</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">{plan.invoices} facturas / mes</p>
                  </div>

                  <div className="mt-7 flex flex-wrap items-end gap-2">
                    <span className="text-5xl font-black tracking-tight text-foreground">{formatUsd(displayPrice)}</span>
                    <span className="pb-1 text-base text-muted-foreground">{displaySuffix}</span>
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {billingMode === "anual"
                      ? `${formatUsd(billing.rate)} por factura con pago anual.`
                      : "Sin permanencia obligatoria."}
                  </p>

                  <div className="mt-6">
                    <Button
                      asChild
                      className={[
                        "flex h-12 w-full items-center justify-center rounded-2xl px-6 text-center text-base font-semibold",
                        plan.popular ? "bg-primary text-primary-foreground hover:bg-primary/90" : "",
                      ].join(" ")}
                      variant={plan.popular ? "default" : "outline"}
                    >
                      <a href={whatsappLink} target="_blank" rel="noreferrer">
                        Solicitar este plan
                      </a>
                    </Button>
                  </div>

                  <div className="mt-8 space-y-4">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/12 text-primary">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-sm leading-6 text-foreground/92">{feature}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}

          <aside className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-[linear-gradient(180deg,rgba(37,99,235,0.16),rgba(15,23,42,0.82))] p-8 shadow-[0_18px_60px_rgba(15,23,42,0.26)]">
            <div className="absolute inset-x-8 top-0 h-px bg-white/12" />
            <div className="relative">
              <Badge className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-300 hover:bg-emerald-500/15">
                Cotización gratis
              </Badge>
              <h3 className="mt-5 text-3xl font-black tracking-tight text-foreground">Plan personalizado</h3>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{customPlanText}</p>

              <div className="mt-7 rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ideal para</p>
                <ul className="mt-4 space-y-3">
                  {[
                    "Volumen irregular de facturas",
                    "Más usuarios o áreas internas",
                    "Necesidad de integración o soporte comercial",
                    "Operaciones con varias sedes",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/12 text-primary">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-sm leading-6 text-foreground/92">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-7 space-y-4">
                <Button
                  asChild
                  className="flex h-14 w-full min-w-0 items-center justify-center overflow-hidden rounded-2xl px-4 text-center text-sm font-semibold leading-none sm:text-base"
                >
                  <a href={whatsappLink} target="_blank" rel="noreferrer">
                    <span className="block w-full truncate text-center">Cotizar por WhatsApp</span>
                  </a>
                </Button>
                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">WhatsApp directo</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">+593 099 813 4331</p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="mx-auto mt-10 max-w-3xl text-center text-sm leading-7 text-muted-foreground">
          Si quieres que también dejemos armado el onboarding comercial y la entrega inicial de credenciales, te lo
          cotizamos sin costo en la misma conversación.
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
