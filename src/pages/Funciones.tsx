import { Check, FileText, ShieldCheck, BarChart3, Zap, Users, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const categories = [
  {
    icon: FileText,
    title: "Facturación electrónica",
    features: ["Facturas", "Notas de crédito y débito", "Retenciones", "Guías de remisión", "Liquidaciones de compras", "Emisión masiva"],
  },
  {
    icon: ShieldCheck,
    title: "Cumplimiento SRI",
    features: ["Validación automática", "Reportes ATS", "Anexos transaccionales", "Firma electrónica", "Claves de contingencia", "Ambiente de pruebas"],
  },
  {
    icon: BarChart3,
    title: "Reportes y análisis",
    features: ["Dashboard en tiempo real", "Reportes de ventas", "Reportes de gastos", "Balance general", "Exportación Excel/PDF", "Indicadores clave"],
  },
  {
    icon: Users,
    title: "Gestión",
    features: ["Clientes y proveedores", "Multi-usuario", "Roles y permisos", "Multi-sucursal", "Historial de comprobantes", "Búsqueda avanzada"],
  },
  {
    icon: Globe,
    title: "Integraciones",
    features: ["API REST completa", "Webhooks", "Integración contable", "Importación de datos", "Conexión bancaria", "Exportación automática"],
  },
  {
    icon: Zap,
    title: "Productividad",
    features: ["Plantillas personalizadas", "Envío automático por email", "Notificaciones", "Respaldo en la nube", "Soporte técnico", "Actualizaciones continuas"],
  },
];

const Funciones = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6">
              Todas las <span className="text-gradient">funcionalidades</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              ContaNova integra todo lo que tu empresa necesita para cumplir con el SRI y optimizar su gestión financiera.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            {categories.map((cat) => (
              <div key={cat.title} className="bg-card border border-border rounded-xl p-6 shadow-card">
                <div className="w-10 h-10 rounded-lg bg-cn-blue-50 flex items-center justify-center mb-4">
                  <cat.icon size={20} className="text-primary" />
                </div>
                <h3 className="font-bold text-foreground text-lg mb-4">{cat.title}</h3>
                <ul className="space-y-2">
                  {cat.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check size={14} className="text-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
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

export default Funciones;
