import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Demo from "./pages/Demo";
import Funciones from "./pages/Funciones";
import Precios from "./pages/Precios";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import { DashboardLayout }  from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/dashboard/ProtectedRoute";
import DashboardHome from "./modules/dashboard/DashboardHome";
import Facturacion from "./modules/facturacion/Facturacion";
import FacturaDetalle from "./modules/facturacion/FacturaDetalle";
import Clientes from "./modules/clientes/Clientes";
import ClienteDetalle from "./modules/clientes/ClienteDetalle";
import Productos from "./modules/productos/Productos";
import Reportes from "./modules/reportes/Reportes";
import Configuracion from "./modules/configuracion/Configuracion";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/funciones" element={<Funciones />} />
            <Route path="/precios" element={<Precios />} />
            <Route path="/contacto" element={<Contact />} />

            {/* Dashboard routes - protected */}
            <Route path="/app" element={<ProtectedRoute module="dashboard"><DashboardLayout><DashboardHome /></DashboardLayout></ProtectedRoute>} />
            <Route path="/app/facturacion" element={<ProtectedRoute module="facturacion"><DashboardLayout><Facturacion /></DashboardLayout></ProtectedRoute>} />
            <Route path="/app/facturacion/:id" element={<ProtectedRoute module="facturacion"><DashboardLayout><FacturaDetalle /></DashboardLayout></ProtectedRoute>} />
            <Route path="/app/clientes" element={<ProtectedRoute module="clientes"><DashboardLayout><Clientes /></DashboardLayout></ProtectedRoute>} />
            <Route path="/app/clientes/:id" element={<ProtectedRoute module="clientes"><DashboardLayout><ClienteDetalle /></DashboardLayout></ProtectedRoute>} />
            <Route path="/app/productos" element={<ProtectedRoute module="productos"><DashboardLayout><Productos /></DashboardLayout></ProtectedRoute>} />
            <Route path="/app/reportes" element={<ProtectedRoute module="reportes"><DashboardLayout><Reportes /></DashboardLayout></ProtectedRoute>} />
            <Route path="/app/configuracion" element={<ProtectedRoute><DashboardLayout><Configuracion /></DashboardLayout></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
