import { Check } from "lucide-react";

const features = [
  "Emisión masiva de facturas electrónicas",
  "Anulación y reenvío de comprobantes",
  "Gestión de clientes y proveedores",
  "Retenciones y notas de crédito/débito",
  "Guías de remisión electrónicas",
  "Liquidaciones de compras",
  "Reportes ATS automáticos",
  "Exportación a Excel y PDF",
  "Multi-usuario con roles y permisos",
  "Soporte técnico especializado",
  "Integración con sistemas contables",
  "Respaldo automático en la nube",
];

const FeaturesSection = () => {
  return (
    <section id="funciones" className="py-20 lg:py-28">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                Funcionalidades que{" "}
                <span className="text-gradient">impulsan tu negocio</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                ContaNova integra todo lo que necesitas para cumplir con el SRI y mantener tus 
                finanzas organizadas desde un solo lugar.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((f) => (
                <div key={f} className="flex items-start gap-3 py-2">
                  <div className="w-5 h-5 rounded-full bg-cn-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={12} className="text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{f}</span>
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
