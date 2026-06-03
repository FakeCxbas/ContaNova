import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Activity, ArrowRight, CheckCircle, Clock, DollarSign, FileText, ShoppingBag, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
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

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonthLabel = now.toLocaleString("es", { month: "long", year: "numeric" });
  const currentMonthShort = now.toLocaleString("es", { month: "short" });

  const currentMonthInvoices = useMemo(
    () => invoices.filter((invoice) => {
      const date = new Date(invoice.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }),
    [currentMonth, currentYear, invoices],
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
    invoices.forEach((invoice) => {
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
  }, [clients, invoices]);

  const statusDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach((invoice) => {
      const label = getInvoiceStatusMeta(invoice.status).label;
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [invoices]);

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
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen de tu negocio - {currentMonthLabel}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((metric) => (
          <Card
            key={metric.title}
            className="group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
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
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{metric.title}</p>
                  <p className="mt-1 text-2xl font-bold">{metric.value}</p>
                  <div className="mt-3 flex max-h-0 items-center gap-1 overflow-hidden text-xs font-medium text-primary opacity-0 transition-all duration-200 group-hover:max-h-10 group-hover:opacity-100">
                    <span>{metric.helper}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${metric.color}`}>
                  <metric.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Ventas por dia</CardTitle>
          </CardHeader>
          <CardContent>
            {salesData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="ventas" fill="var(--color-ventas)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">Sin datos de ventas este mes.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado de facturas</CardTitle>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <div className="flex h-[280px] flex-col items-center justify-center">
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <PieChart>
                    <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {statusDistribution.map((_, index) => (
                        <Cell key={index} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">Sin facturas.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              Top clientes por facturacion
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Sin datos.</p>
            ) : (
              <div className="space-y-3">
                {topClients.map((item, index) => (
                  <button
                    key={item.name}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/50"
                    onClick={() => item.clientId ? navigate(`/app/clientes/${item.clientId}`) : navigate("/app/clientes")}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-xs font-bold text-muted-foreground">{index + 1}</span>
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">${item.total.toFixed(2)}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ultimas facturas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : invoices.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No hay facturas registradas.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.slice(0, 5).map((invoice) => {
                    return (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => navigate(`/app/facturacion/${invoice.id}`)}
                      >
                        <TableCell className="text-sm">{invoice.date}</TableCell>
                        <TableCell className="max-w-[120px] truncate text-sm font-medium">{invoice.client_name}</TableCell>
                        <TableCell className="text-right text-sm">${Number(invoice.total).toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-between gap-2">
                            <InvoiceStatusBadge status={invoice.status} />
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
    editar_factura: "Edicion",
    enviar_factura: "Correo",
    registrar_pago: "Pago",
    crear_cliente: "Cliente",
    editar_cliente: "Cliente",
    eliminar_cliente: "Cliente",
    crear_producto: "Producto",
    editar_producto: "Producto",
    actualizar_configuracion: "Configuracion",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-muted-foreground" />
          Actividad reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : activities.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sin actividad registrada.</p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity: ActivityLog) => (
              <div key={activity.id} className="flex items-start gap-3 border-b border-border/50 py-2 last:border-0">
                <div className="mt-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                  {actionLabels[activity.action as ActivityAction] || "Evento"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user_name}</span>{" "}
                    <span className="text-muted-foreground">{activity.description}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
