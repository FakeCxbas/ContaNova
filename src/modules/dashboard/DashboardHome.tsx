import { DollarSign, FileText, CheckCircle, Clock, Users, ShoppingBag, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { useInvoices } from "@/services/invoices";
import { useClients } from "@/services/clients";
import { usePayments } from "@/services/payments";
import { useRecentActivity } from "@/services/activity";
import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

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

const statusVariant = (s: string) =>
  s === "enviada" ? "default" : s === "borrador" ? "secondary" : s === "pagada" ? "outline" : "destructive";

export default function DashboardHome() {
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: clients = [] } = useClients();
  const { data: payments = [] } = usePayments();

  const now = new Date();

  const currentMonthInvoices = useMemo(
    () => invoices.filter(inv => {
      const d = new Date(inv.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }),
    [invoices]
  );

  const metrics = useMemo(() => {
    const totalSales = currentMonthInvoices.reduce((s, inv) => s + Number(inv.total), 0);
    const emitted = currentMonthInvoices.length;
    const paid = currentMonthInvoices.filter(inv => inv.status === "pagada").length;
    const pending = currentMonthInvoices.filter(inv => inv.status === "enviada" || inv.status === "borrador").length;
    const activeClients = clients.length;

    return [
      { title: "Ingresos del mes", value: `$${totalSales.toFixed(2)}`, icon: DollarSign, color: "text-emerald-600 bg-emerald-500/10" },
      { title: "Facturas emitidas", value: String(emitted), icon: FileText, color: "text-blue-600 bg-blue-500/10" },
      { title: "Facturas pagadas", value: String(paid), icon: CheckCircle, color: "text-green-600 bg-green-500/10" },
      { title: "Facturas pendientes", value: String(pending), icon: Clock, color: "text-amber-600 bg-amber-500/10" },
      { title: "Clientes activos", value: String(activeClients), icon: Users, color: "text-violet-600 bg-violet-500/10" },
    ];
  }, [currentMonthInvoices, clients]);

  const salesData = useMemo(() => {
    const days: Record<string, number> = {};
    currentMonthInvoices.forEach(inv => {
      const day = new Date(inv.date).getDate();
      const label = `${day} ${now.toLocaleString("es", { month: "short" })}`;
      days[label] = (days[label] || 0) + Number(inv.total);
    });
    return Object.entries(days).map(([day, ventas]) => ({ day, ventas }));
  }, [currentMonthInvoices]);

  const topProducts = useMemo(() => {
    // Aggregate from invoice_items via invoices - we use all invoices items indirectly
    // Since we don't have all items loaded, aggregate by client_name as proxy for top clients
    const clientTotals: Record<string, number> = {};
    invoices.forEach(inv => {
      clientTotals[inv.client_name] = (clientTotals[inv.client_name] || 0) + Number(inv.total);
    });
    return Object.entries(clientTotals)
      .filter(([name]) => name.trim() !== "")
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [invoices]);

  const statusDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach(inv => {
      const label = inv.status.charAt(0).toUpperCase() + inv.status.slice(1);
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Resumen de tu negocio — {now.toLocaleString("es", { month: "long", year: "numeric" })}</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((m) => (
          <Card key={m.title}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{m.title}</p>
                  <p className="text-2xl font-bold mt-1">{m.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${m.color}`}>
                  <m.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Ventas por día</CardTitle>
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
              <p className="text-muted-foreground text-sm text-center py-12">Sin datos de ventas este mes.</p>
            )}
          </CardContent>
        </Card>

        {/* Status pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado de facturas</CardTitle>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <div className="h-[280px] flex flex-col items-center justify-center">
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <PieChart>
                    <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {statusDistribution.map((_, i) => (
                        <Cell key={i} fill={pieColors[i % pieColors.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">Sin facturas.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: top clients + recent invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top clients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              Top clientes por facturación
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Sin datos.</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold">${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimas facturas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">No hay facturas registradas.</p>
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
                  {invoices.slice(0, 5).map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-sm">{inv.date}</TableCell>
                      <TableCell className="text-sm font-medium truncate max-w-[120px]">{inv.client_name}</TableCell>
                      <TableCell className="text-sm text-right">${Number(inv.total).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity feed */}
      <ActivityFeed />
    </div>
  );
}

function ActivityFeed() {
  const { data: activities = [], isLoading } = useRecentActivity(10);

  const actionIcons: Record<string, string> = {
    crear_factura: "📄",
    editar_factura: "✏️",
    crear_cliente: "👤",
    editar_cliente: "✏️",
    eliminar_cliente: "🗑️",
    registrar_pago: "💰",
    crear_producto: "📦",
    editar_producto: "✏️",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          Actividad reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">Sin actividad registrada.</p>
        ) : (
          <div className="space-y-3">
            {activities.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 py-2 border-b last:border-0 border-border/50">
                <span className="text-lg mt-0.5">{actionIcons[a.action] || "📋"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{a.user_name}</span>{" "}
                    <span className="text-muted-foreground">{a.description}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: es })}
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
