import { useMemo } from "react";
import { Download } from "lucide-react";
import { ExportMenu } from "@/components/ExportMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { exportReportsToExcel, exportReportsToCSV, exportReportsToPDF } from "@/utils/exportUtils";
import { useInvoices } from "@/services/invoices";
import { usePayments } from "@/services/payments";

const salesConfig = { ventas: { label: "Ventas", color: "hsl(var(--primary))" } };
const ivaConfig = { iva: { label: "IVA generado", color: "hsl(221 83% 46%)" } };
const invoicesConfig = { facturas: { label: "Facturas", color: "hsl(var(--primary))" } };
const paymentsConfig = { pagos: { label: "Pagos recibidos", color: "hsl(142 71% 45%)" } };
const statusConfig = { cantidad: { label: "Facturas", color: "hsl(var(--primary))" } };
const clientsConfig = { total: { label: "Total compras", color: "hsl(262 83% 58%)" } };

const PIE_COLORS = [
  "hsl(var(--muted-foreground))",
  "hsl(221 83% 53%)",
  "hsl(142 71% 45%)",
  "hsl(0 84% 60%)",
];

export default function Reportes() {
  const { data: invoices = [] } = useInvoices();
  const { data: payments = [] } = usePayments();

  const monthlySales = useMemo(() => {
    const map: Record<string, { ventas: number; iva: number }> = {};
    invoices.forEach(inv => {
      const d = new Date(inv.date);
      const key = d.toLocaleString("es", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { ventas: 0, iva: 0 };
      map[key].ventas += Number(inv.total);
      map[key].iva += Number(inv.iva);
    });
    return Object.entries(map).map(([month, v]) => ({ month, ...v }));
  }, [invoices]);

  const monthlyInvoices = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach(inv => {
      const d = new Date(inv.date);
      const key = d.toLocaleString("es", { month: "short", year: "2-digit" });
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([month, facturas]) => ({ month, facturas }));
  }, [invoices]);

  const paymentsByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach(p => {
      const d = new Date(p.date);
      const key = d.toLocaleString("es", { month: "short", year: "2-digit" });
      map[key] = (map[key] || 0) + Number(p.amount);
    });
    return Object.entries(map).map(([month, pagos]) => ({ month, pagos }));
  }, [payments]);

  const invoicesByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach(inv => {
      const label = inv.status.charAt(0).toUpperCase() + inv.status.slice(1);
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([estado, cantidad]) => ({ estado, cantidad }));
  }, [invoices]);

  const topClients = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach(inv => {
      map[inv.client_name] = (map[inv.client_name] || 0) + Number(inv.total);
    });
    return Object.entries(map)
      .map(([cliente, total]) => ({ cliente, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-muted-foreground text-sm">Análisis financiero de tu negocio</p>
        </div>
        <ExportMenu
          onCSV={() => exportReportsToCSV({ monthlySales, monthlyInvoices, paymentsByMonth, topClients })}
          onExcel={() => exportReportsToExcel({ monthlySales, monthlyInvoices, paymentsByMonth, topClients })}
          onPDF={() => exportReportsToPDF({ monthlySales, monthlyInvoices, paymentsByMonth, topClients })}
          disabled={invoices.length === 0}
        />
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay datos para mostrar. Crea facturas para ver tus reportes.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Ventas por mes</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={salesConfig} className="h-[280px] w-full">
                <BarChart data={monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="ventas" fill="var(--color-ventas)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Facturas por estado</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={statusConfig} className="h-[280px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="estado" />} />
                  <Pie data={invoicesByStatus} dataKey="cantidad" nameKey="estado" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={4}
                    label={({ estado, cantidad }) => `${estado}: ${cantidad}`}>
                    {invoicesByStatus.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Pagos recibidos por mes</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={paymentsConfig} className="h-[280px] w-full">
                <LineChart data={paymentsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="pagos" stroke="var(--color-pagos)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Clientes con más compras</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={clientsConfig} className="h-[280px] w-full">
                <BarChart data={topClients} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="cliente" type="category" width={130} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="var(--color-total)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">IVA generado por mes</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={ivaConfig} className="h-[280px] w-full">
                <LineChart data={monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="iva" stroke="var(--color-iva)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Facturas emitidas por mes</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={invoicesConfig} className="h-[280px] w-full">
                <BarChart data={monthlyInvoices}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="facturas" fill="var(--color-facturas)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
