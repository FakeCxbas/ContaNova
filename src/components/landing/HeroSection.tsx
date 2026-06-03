import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, UserCog, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import dashboardMockup from "@/assets/dashboard-mockup.png";

const HeroSection = () => {
  return (
    <section id="inicio" className="pt-32 pb-20 lg:pt-40 lg:pb-32">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cn-blue-50 text-primary text-xs font-medium mb-6">
            EC Plataforma con acceso guiado para cada empresa
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6">
            Facturacion electronica{" "}
            <span className="text-gradient">simple y controlada</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Emite comprobantes compatibles con el SRI, organiza tu operacion
            y administra el acceso de cada cliente o colaborador desde un panel interno.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8 h-12 gap-2" asChild>
              <Link to="/login">Iniciar sesion <ArrowRight size={18} /></Link>
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8 h-12" asChild>
              <Link to="/demo">Ver demostracion</Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-card">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm font-semibold text-foreground">Solicita tus credenciales hoy</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Te ayudamos a activar tu empresa y entregarte el acceso inicial para empezar a operar sin friccion.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-card">
              <UserCog className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm font-semibold text-foreground">Accesos listos para tu equipo</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                El administrador define roles y entrega credenciales claras para cada persona de la empresa.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-card">
              <KeyRound className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm font-semibold text-foreground">Ingreso inmediato</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Una vez activado el acceso, tu cliente o colaborador entra directo por inicio de sesion.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="rounded-xl border border-border overflow-hidden shadow-hero">
            <img
              src={dashboardMockup}
              alt="ContaNova - Dashboard de facturacion electronica"
              className="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
