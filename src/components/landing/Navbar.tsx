import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/branding/BrandMark";

const navLinks = [
  { label: "Inicio", href: "/" },
  { label: "Funciones", href: "/funciones" },
  { label: "Precios", href: "/precios" },
  { label: "Contacto", href: "/contacto" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/60 transition-all">
      <div className="container mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
        <Link to="/" className="shrink-0 transition-opacity hover:opacity-90">
          <BrandLogo className="gap-2.5" />
        </Link>

        <div className="hidden md:flex items-center gap-1 bg-muted/40 p-1 rounded-full border border-border/50">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button
            size="sm"
            className="rounded-full px-5 h-9 text-xs font-semibold shadow-md shadow-primary/20 hover:shadow-primary/35 hover:-translate-y-0.5 transition-all gap-1.5"
            asChild
          >
            <Link to="/login">
              Iniciar sesion
              <ArrowRight size={14} />
            </Link>
          </Button>
        </div>

        <button
          className="md:hidden text-foreground p-2 rounded-lg hover:bg-muted/60 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Abrir menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-2xl border-b border-border px-5 pb-5 pt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="block text-sm font-medium text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2">
            <Button className="w-full rounded-full h-10 text-sm font-semibold shadow-md shadow-primary/20" asChild>
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                Iniciar sesion
              </Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
