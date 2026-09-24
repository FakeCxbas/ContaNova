import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/dashboard/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Demo = lazy(() => import("./pages/Demo"));
const Funciones = lazy(() => import("./pages/Funciones"));
const Precios = lazy(() => import("./pages/Precios"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DashboardHome = lazy(() => import("./modules/dashboard/DashboardHome"));
const Facturacion = lazy(() => import("./modules/facturacion/Facturacion"));
const FacturaDetalle = lazy(() => import("./modules/facturacion/FacturaDetalle"));
const Clientes = lazy(() => import("./modules/clientes/Clientes"));
const ClienteDetalle = lazy(() => import("./modules/clientes/ClienteDetalle"));
const Productos = lazy(() => import("./modules/productos/Productos"));
const Reportes = lazy(() => import("./modules/reportes/Reportes"));
const Configuracion = lazy(() => import("./modules/configuracion/Configuracion"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 15,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/demo" element={<Demo />} />
                <Route path="/funciones" element={<Funciones />} />
                <Route path="/precios" element={<Precios />} />
                <Route path="/contacto" element={<Contact />} />

                <Route
                  path="/app"
                  element={
                    <ProtectedRoute module="dashboard">
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardHome />} />
                  <Route
                    path="facturacion"
                    element={
                      <ProtectedRoute module="facturacion">
                        <Facturacion />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="facturacion/:id"
                    element={
                      <ProtectedRoute module="facturacion">
                        <FacturaDetalle />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="clientes"
                    element={
                      <ProtectedRoute module="clientes">
                        <Clientes />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="clientes/:id"
                    element={
                      <ProtectedRoute module="clientes">
                        <ClienteDetalle />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="productos"
                    element={
                      <ProtectedRoute module="productos">
                        <Productos />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="reportes"
                    element={
                      <ProtectedRoute module="reportes">
                        <Reportes />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="configuracion"
                    element={
                      <ProtectedRoute module="configuracion">
                        <Configuracion />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
