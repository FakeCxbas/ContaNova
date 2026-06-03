import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import dashboardMockup from "@/assets/dashboard-mockup.png";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const Demo = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6">
              Conoce <span className="text-gradient">ContaNova</span> en acción
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Explora nuestro dashboard intuitivo diseñado para que emitas comprobantes electrónicos, 
              gestiones clientes y visualices reportes financieros en tiempo real.
            </p>
          </div>

          <div className="max-w-5xl mx-auto mb-16">
            <div className="rounded-xl border border-border overflow-hidden shadow-hero">
              <img
                src={dashboardMockup}
                alt="ContaNova - Dashboard de facturación electrónica"
                className="w-full h-auto"
              />
            </div>
          </div>

          <div className="max-w-3xl mx-auto grid sm:grid-cols-3 gap-6 mb-16">
            {[
              { title: "Emisión rápida", desc: "Crea y envía facturas electrónicas al SRI en segundos." },
              { title: "Panel intuitivo", desc: "Visualiza ventas, gastos y estado tributario de un vistazo." },
              { title: "Reportes automáticos", desc: "Genera ATS, balances y reportes listos para el SRI." },
            ].map((item) => (
              <div key={item.title} className="bg-card border border-border rounded-xl p-6 shadow-card">
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button size="lg" className="text-base px-8 h-12 gap-2" asChild>
              <Link to="/login">Solicitar acceso <ArrowRight size={18} /></Link>
            </Button>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Demo;
