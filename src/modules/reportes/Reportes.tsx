import { useMemo } from "react";
import { ExportMenu } from "@/components/ExportMenu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { exportReportsToExcel, exportReportsToCSV, exportReportsToPDF } from "@/utils/exportUtils";
import { useInvoices } from "@/services/invoices";
import { usePayments } from "@/services/payments";
import { useIsMobile } from "@/hooks/use-mobile";

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

const truncateLabel = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;

export default function Reportes() {
  const { data: invoices = [] } = useInvoices();
  const { data: payments = [] } = usePayments();
  const isMobile = useIsMobile();

  const reportInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.status !== "anulada"),
    [invoices],
  );

  const monthlySales = useMemo(() => {
    const map: Record<string, { ventas: number; iva: number }> = {};
    reportInvoices.forEach((invoice) => {
      const date = new Date(invoice.date);
      const key = date.toLocaleString("es", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { ventas: 0, iva: 0 };
      map[key].ventas += Number(invoice.total);
      map[key].iva += Number(invoice.iva);
    });
    return Object.entries(map).map(([month, values]) => ({ month, ...values }));
  }, [reportInvoices]);

  const monthlyInvoices = useMemo(() => {
    const map: Record<string, number> = {};
    reportInvoices.forEach((invoice) => {
      const date = new Date(invoice.date);
      const key = date.toLocaleString("es", { month: "short", year: "2-digit" });
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([month, facturas]) => ({ month, facturas }));
  }, [reportInvoices]);

  const paymentsByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach((payment) => {
      const date = new Date(payment.date);
      const key = date.toLocaleString("es", { month: "short", year: "2-digit" });
      map[key] = (map[key] || 0) + Number(payment.amount);
    });
    return Object.entries(map).map(([month, pagos]) => ({ month, pagos }));
  }, [payments]);

  const invoicesByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    reportInvoices.forEach((invoice) => {
      const label = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([estado, cantidad]) => ({ estado, cantidad }));
  }, [reportInvoices]);

  const topClients = useMemo(() => {
    const map: Record<string, number> = {};
    reportInvoices.forEach((invoice) => {
      map[invoice.client_name] = (map[invoice.client_name] || 0) + Number(invoice.total);
    });
    return Object.entries(map)
      .map(([cliente, total]) => ({ cliente, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [reportInvoices]);

  const axisMargin = { top: 12, right: 8, left: isMobile ? -18 : 0, bottom: 0 };
  const yAxisWidth = isMobile ? 34 : 48;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-sm text-muted-foreground">Analisis financiero de tu negocio</p>
        </div>
        <div className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">
          <ExportMenu
            onCSV={() => exportReportsToCSV({ monthlySales, monthlyInvoices, paymentsByMonth, topClients })}
            onExcel={() => exportReportsToExcel({ monthlySales, monthlyInvoices, paymentsByMonth, topClients })}
            onPDF={() => exportReportsToPDF({ monthlySales, monthlyInvoices, paymentsByMonth, topClients })}
            disabled={reportInvoices.length === 0}
          />
        </div>
      </div>

      {reportInvoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay datos para mostrar. Crea facturas para ver tus reportes.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Ventas por mes</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-4 sm:px-6">
              <ChartContainer config={salesConfig} className="h-[240px] w-full sm:h-[280px]">
                <BarChart data={monthlySales} margin={axisMargin}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickMargin={8} />
                  <YAxis tick={{ fontSize: 11 }} width={yAxisWidth} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="ventas" fill="var(--color-ventas)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Facturas por estado</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-4 sm:px-6">
              <ChartContainer config={statusConfig} className="h-[220px] w-full sm:h-[280px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="estado" />} />
                  <Pie
                    data={invoicesByStatus}
                    dataKey="cantidad"
                    nameKey="estado"
                    cx="50%"
                    cy="50%"
                    outerRadius={isMobile ? 78 : 100}
                    innerRadius={isMobile ? 42 : 50}
                    paddingAngle={4}
                    label={isMobile ? false : ({ estado, cantidad }) => `${estado}: ${cantidad}`}
                  >
                    {invoicesByStatus.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              {isMobile && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {invoicesByStatus.map((item, index) => (
                    <div key={item.estado} className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="truncate">
                        {item.estado}: {item.cantidad}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pagos recibidos por mes</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-4 sm:px-6">
              <ChartContainer config={paymentsConfig} className="h-[240px] w-full sm:h-[280px]">
                <LineChart data={paymentsByMonth} margin={axisMargin}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickMargin={8} />
                  <YAxis tick={{ fontSize: 11 }} width={yAxisWidth} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="pagos" stroke="var(--color-pagos)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Clientes con mas compras</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-4 sm:px-6">
              <ChartContainer config={clientsConfig} className="h-[260px] w-full sm:h-[280px]">
                <BarChart
                  data={topClients}
                  layout="vertical"
                  margin={{ top: 12, right: 12, left: isMobile ? 0 : 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    dataKey="cliente"
                    type="category"
                    width={isMobile ? 92 : 130}
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    tickFormatter={(value: string) => truncateLabel(value, isMobile ? 12 : 18)}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="var(--color-total)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">IVA generado por mes</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-4 sm:px-6">
              <ChartContainer config={ivaConfig} className="h-[240px] w-full sm:h-[280px]">
                <LineChart data={monthlySales} margin={axisMargin}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickMargin={8} />
                  <YAxis tick={{ fontSize: 11 }} width={yAxisWidth} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="iva" stroke="var(--color-iva)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Facturas emitidas por mes</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-4 sm:px-6">
              <ChartContainer config={invoicesConfig} className="h-[240px] w-full sm:h-[280px]">
                <BarChart data={monthlyInvoices} margin={axisMargin}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickMargin={8} />
                  <YAxis tick={{ fontSize: 11 }} width={yAxisWidth} />
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
