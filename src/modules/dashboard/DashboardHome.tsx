import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Activity, ArrowRight, CheckCircle, Clock, DollarSign, FileText, ShoppingBag, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "@/components/status/InvoiceStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { getInvoiceStatusMeta, isPendingCollection } from "@/lib/invoice-status";
import { useRecentActivity } from "@/services/activity";
import type { ActivityAction } from "@/services/activityService";
import { useClients } from "@/services/clients";
import { useInvoices } from "@/services/invoices";
import type { Tables } from "@/integrations/supabase/types";

const chartConfig = {
  ventas: { label: "Ventas", color: "hsl(var(--primary))" },
};

const pieColors = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(160, 60%, 45%)",
];

export default function DashboardHome() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: clients = [] } = useClients();
  const billableInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.status !== "anulada"),
    [invoices],
  );

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonthLabel = now.toLocaleString("es", { month: "long", year: "numeric" });
  const currentMonthShort = now.toLocaleString("es", { month: "short" });

  const currentMonthInvoices = useMemo(
    () => billableInvoices.filter((invoice) => {
      const date = new Date(invoice.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }),
    [billableInvoices, currentMonth, currentYear],
  );

  const metrics = useMemo(() => {
    const totalSales = currentMonthInvoices.reduce((sum, invoice) => sum + Number(invoice.total), 0);
    const emitted = currentMonthInvoices.length;
    const paid = currentMonthInvoices.filter((invoice) => invoice.status === "pagada").length;
    const pending = currentMonthInvoices.filter((invoice) => isPendingCollection(invoice.status)).length;
    const activeClients = clients.length;

    return [
      {
        title: "Ingresos del mes",
        value: `$${totalSales.toFixed(2)}`,
        icon: DollarSign,
        color: "text-emerald-600 bg-emerald-500/10",
        helper: "Abrir reportes",
        action: () => navigate("/app/reportes"),
      },
      {
        title: "Facturas emitidas",
        value: String(emitted),
        icon: FileText,
        color: "text-blue-600 bg-blue-500/10",
        helper: "Ir a facturacion",
        action: () => navigate("/app/facturacion"),
      },
      {
        title: "Facturas pagadas",
        value: String(paid),
        icon: CheckCircle,
        color: "text-green-600 bg-green-500/10",
        helper: "Revisar cobradas",
        action: () => navigate("/app/reportes"),
      },
      {
        title: "Facturas pendientes",
        value: String(pending),
        icon: Clock,
        color: "text-amber-600 bg-amber-500/10",
        helper: "Ver pendientes",
        action: () => navigate("/app/facturacion"),
      },
      {
        title: "Clientes activos",
        value: String(activeClients),
        icon: Users,
        color: "text-violet-600 bg-violet-500/10",
        helper: "Abrir clientes",
        action: () => navigate("/app/clientes"),
      },
    ];
  }, [clients.length, currentMonthInvoices, navigate]);

  const salesData = useMemo(() => {
    const days: Record<string, number> = {};
    currentMonthInvoices.forEach((invoice) => {
      const day = new Date(invoice.date).getDate();
      const label = `${day} ${currentMonthShort}`;
      days[label] = (days[label] || 0) + Number(invoice.total);
    });
    return Object.entries(days).map(([day, ventas]) => ({ day, ventas }));
  }, [currentMonthInvoices, currentMonthShort]);

  const topClients = useMemo(() => {
    const totals: Record<string, number> = {};
    billableInvoices.forEach((invoice) => {
      totals[invoice.client_name] = (totals[invoice.client_name] || 0) + Number(invoice.total);
    });
    return Object.entries(totals)
      .filter(([name]) => name.trim() !== "")
      .map(([name, total]) => ({
        name,
        total,
        clientId: clients.find((client) => client.name === name)?.id,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [billableInvoices, clients]);

  const statusDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    billableInvoices.forEach((invoice) => {
      const label = getInvoiceStatusMeta(invoice.status).label;
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [billableInvoices]);

  if (role === "superadmin") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Vista general de plataforma para la administracion central.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Rol activo</p>
              <p className="mt-2 text-2xl font-bold">Superadmin</p>
              <p className="mt-2 text-sm text-muted-foreground">Gestiona empresas, accesos iniciales y onboarding comercial.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Siguiente paso</p>
              <p className="mt-2 text-lg font-semibold">Crear empresas desde Configuracion</p>
              <p className="mt-2 text-sm text-muted-foreground">Cada empresa recibe su propio administrador inicial y queda aislada por tenant.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Alcance</p>
              <p className="mt-2 text-lg font-semibold">Panel maestro</p>
              <p className="mt-2 text-sm text-muted-foreground">Este perfil no opera facturas; administra la plataforma y provisiona clientes.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Panel General</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Resumen de operaciones y actividad en tiempo real</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/80 bg-muted/40 text-xs font-semibold text-muted-foreground self-start sm:self-auto shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="capitalize">{currentMonthLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((metric) => (
          <Card
            key={metric.title}
            className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm p-5 shadow-card hover:border-primary/40 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            onClick={metric.action}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                metric.action();
              }
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">{metric.title}</p>
                <p className="mt-1.5 text-2xl font-black tracking-tight text-foreground">{metric.value}</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                  <span>{metric.helper}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${metric.color} group-hover:scale-110 transition-transform duration-200`}>
                <metric.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-foreground">Ventas por día</CardTitle>
          </CardHeader>
          <CardContent>
            {salesData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.6)" />
                  <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="ventas" fill="var(--color-ventas)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">Sin datos de ventas este mes.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-foreground">Estado de facturas</CardTitle>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <div className="flex h-[280px] flex-col items-center justify-center">
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <PieChart>
                    <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45} label={({ name, value }) => `${name}: ${value}`}>
                      {statusDistribution.map((_, index) => (
                        <Cell key={index} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">Sin facturas emitidas este mes.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Top clientes por facturación
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sin clientes registrados aún.</p>
            ) : (
              <div className="space-y-2">
                {topClients.map((item, index) => (
                  <button
                    key={item.name}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-all hover:bg-muted/60 border border-transparent hover:border-border/50"
                    onClick={() => item.clientId ? navigate(`/app/clientes/${item.clientId}`) : navigate("/app/clientes")}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold truncate text-foreground">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-foreground">${item.total.toFixed(2)}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base font-bold text-foreground">
              <span>Últimas facturas</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary font-semibold" onClick={() => navigate("/app/facturacion")}>
                Ver todas <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : billableInvoices.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No hay facturas registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[500px]">
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Cliente</TableHead>
                      <TableHead className="text-right text-xs">Total</TableHead>
                      <TableHead className="text-xs">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billableInvoices.slice(0, 5).map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer transition-colors hover:bg-muted/60 border-border/40"
                        onClick={() => navigate(`/app/facturacion/${invoice.id}`)}
                      >
                        <TableCell className="text-xs text-muted-foreground font-medium">{invoice.date}</TableCell>
                        <TableCell className="max-w-[140px] truncate text-xs font-semibold text-foreground">{invoice.client_name}</TableCell>
                        <TableCell className="text-right text-xs font-bold text-foreground">${Number(invoice.total).toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-between gap-1.5">
                            <InvoiceStatusBadge status={invoice.status} />
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-50 group-hover:opacity-100" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ActivityFeed />
    </div>
  );
}

function ActivityFeed() {
  const { data: activities = [], isLoading } = useRecentActivity(10);
  type ActivityLog = Tables<"activity_logs">;

  const actionLabels: Partial<Record<ActivityAction, string>> = {
    crear_factura: "Factura",
    editar_factura: "Edición",
    enviar_factura: "Correo",
    registrar_pago: "Pago",
    crear_cliente: "Cliente",
    editar_cliente: "Cliente",
    eliminar_cliente: "Cliente",
    crear_producto: "Producto",
    editar_producto: "Producto",
    actualizar_configuracion: "Configuración",
  };

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
          <Activity className="h-4 w-4 text-primary" />
          Actividad reciente del equipo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : activities.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin actividad registrada en este período.</p>
        ) : (
          <div className="space-y-2">
            {activities.map((activity: ActivityLog) => (
              <div key={activity.id} className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/40 border border-transparent hover:border-border/40">
                <div className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary uppercase tracking-wider shrink-0">
                  {actionLabels[activity.action as ActivityAction] || "Evento"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground">
                    <span className="font-semibold">{activity.user_name}</span>{" "}
                    <span className="text-muted-foreground">{activity.description}</span>
                  </p>
                </div>
                <div className="shrink-0 text-[10px] font-medium text-muted-foreground/70">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: es })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
