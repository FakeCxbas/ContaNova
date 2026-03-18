const testimonials = [
  {
    quote: "ContaNova nos ahorró horas de trabajo cada semana. La integración con el SRI es impecable.",
    name: "María García",
    role: "Contadora, Distribuidora Andina",
  },
  {
    quote: "Por fin un sistema de facturación que es fácil de usar y no requiere capacitación técnica.",
    name: "Carlos Mendoza",
    role: "Gerente, AutoPartes Quito",
  },
  {
    quote: "Migramos de otro sistema y el proceso fue increíblemente sencillo. El soporte es excepcional.",
    name: "Ana Lucía Torres",
    role: "Directora Financiera, GreenTech EC",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-20 lg:py-28 bg-cn-gray-50">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            Empresas que confían en ContaNova
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-card rounded-xl p-8 shadow-card">
              <p className="text-foreground leading-relaxed mb-6">"{t.quote}"</p>
              <div>
                <div className="font-semibold text-foreground text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
