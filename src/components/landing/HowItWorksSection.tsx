const steps = [
  {
    number: "01",
    title: "Crea tu cuenta",
    description: "Regístrate en menos de 2 minutos con tus datos básicos y RUC.",
  },
  {
    number: "02",
    title: "Configura tu empresa",
    description: "Sube tu firma electrónica y personaliza tus comprobantes con tu logo.",
  },
  {
    number: "03",
    title: "Emite y gestiona",
    description: "Comienza a emitir facturas electrónicas y controla tus finanzas al instante.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-20 lg:py-28 bg-cn-gray-50">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            Comienza en 3 simples pasos
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Sin instalaciones, sin complicaciones. Empieza a facturar hoy mismo.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="text-5xl font-extrabold text-gradient mb-4">{step.number}</div>
              <h3 className="font-semibold text-foreground text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
