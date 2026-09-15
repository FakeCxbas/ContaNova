import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, UserCog, KeyRound, Lock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import dashboardMockup from "@/assets/dashboard-mockup.webp";

const HeroSection = () => {
  return (
    <section id="inicio" className="relative pt-32 pb-20 lg:pt-40 lg:pb-36 overflow-hidden">
      {/* Resplandor ambiental de fondo */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] sm:w-[1100px] h-[500px] bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-3xl -z-10" />

      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-4xl mx-auto text-center mb-16">
          {/* Pill de estado en vivo con pulso */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-6 shadow-sm shadow-primary/10 hover:border-primary/40 transition-colors">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>SRI Ecuador • Facturación Electrónica en Tiempo Real</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.08] mb-6">
            Facturación electrónica{" "}
            <span className="text-gradient">ágil, moderna y segura</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Emite facturas y comprobantes autorizados por el SRI, sincroniza pagos y administra el acceso 
            de todo tu equipo con una plataforma diseñada para alta velocidad y orden total.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="text-sm sm:text-base font-semibold px-8 h-12 rounded-full gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all w-full sm:w-auto"
              asChild
            >
              <Link to="/login">
                Iniciar sesión ahora <ArrowRight size={18} />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-sm sm:text-base font-semibold px-8 h-12 rounded-full border-border/80 bg-background/80 hover:bg-background hover:border-primary/40 hover:-translate-y-0.5 transition-all w-full sm:w-auto"
              asChild
            >
              <Link to="/demo">Ver demostración guiada</Link>
            </Button>
          </div>

          {/* 3 Tarjetas de valor con micro-estilo glassmorphism */}
          <div className="mt-14 grid gap-4 text-left sm:grid-cols-3">
            <div className="group rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-5 shadow-card hover:border-primary/40 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 mb-3.5 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-foreground">Autorización SRI Directa</p>
              <p className="mt-1 text-xs sm:text-sm leading-5 text-muted-foreground">
                Emisión inmediata y firma digital automática garantizando cumplimiento tributario ecuatoriano.
              </p>
            </div>

            <div className="group rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-5 shadow-card hover:border-primary/40 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 mb-3.5 group-hover:scale-110 transition-transform">
                <UserCog className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-foreground">Accesos y Roles Claros</p>
              <p className="mt-1 text-xs sm:text-sm leading-5 text-muted-foreground">
                Permisos por colaborador, trazabilidad de cobros y control administrativo centralizado.
              </p>
            </div>

            <div className="group rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-5 shadow-card hover:border-primary/40 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 mb-3.5 group-hover:scale-110 transition-transform">
                <KeyRound className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-foreground">Operación en la Nube</p>
              <p className="mt-1 text-xs sm:text-sm leading-5 text-muted-foreground">
                Ingreso protegido desde cualquier dispositivo con sincronización instantánea y respaldos continuos.
              </p>
            </div>
          </div>
        </div>

        {/* Marco de Aplicación SaaS con barra estilo macOS y resplandor */}
        <div className="relative max-w-5xl mx-auto mt-6">
          {/* Halo de luz tras el mockup */}
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 rounded-3xl blur-2xl -z-10 opacity-70" />

          <div className="rounded-2xl border border-border/80 bg-card/90 shadow-hero overflow-hidden backdrop-blur-xl ring-1 ring-white/10 transition-all">
            {/* Barra de ventana estilo Mac / SaaS */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border/60">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/50" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/50" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]/50" />
              </div>

              <div className="flex items-center gap-1.5 px-4 py-1 rounded-full bg-background/80 border border-border/70 text-[11px] font-medium text-muted-foreground">
                <Lock size={11} className="text-emerald-500" />
                <span className="truncate">contanova.org/app</span>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                <Sparkles size={12} />
                <span className="hidden sm:inline">v2.0 Pro</span>
              </div>
            </div>

            {/* Imagen del Mockup */}
            <div className="relative bg-background">
              <img
                src={dashboardMockup}
                alt="ContaNova - Dashboard de facturación electrónica"
                className="w-full h-auto object-cover"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                width={1200}
                height={750}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
