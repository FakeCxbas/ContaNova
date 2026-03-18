import { invoiceService } from "./invoiceService";
import { paymentService } from "./paymentService";

export type MonthlySales = { month: string; ventas: number; iva: number };
export type MonthlyInvoices = { month: string; facturas: number };
export type MonthlyPayments = { month: string; pagos: number };
export type StatusCount = { estado: string; cantidad: number };
export type TopClient = { cliente: string; total: number };

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("es", { month: "short", year: "2-digit" });
}

export const reportService = {
  async getReportData() {
    const [invoices, payments] = await Promise.all([
      invoiceService.getAll(),
      paymentService.getAll(),
    ]);

    const salesMap: Record<string, { ventas: number; iva: number }> = {};
    const invoiceCountMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};
    const clientMap: Record<string, number> = {};

    invoices.forEach((inv) => {
      const key = monthKey(inv.date);
      if (!salesMap[key]) salesMap[key] = { ventas: 0, iva: 0 };
      salesMap[key].ventas += Number(inv.total);
      salesMap[key].iva += Number(inv.iva);
      invoiceCountMap[key] = (invoiceCountMap[key] || 0) + 1;

      const label = inv.status.charAt(0).toUpperCase() + inv.status.slice(1);
      statusMap[label] = (statusMap[label] || 0) + 1;
      clientMap[inv.client_name] = (clientMap[inv.client_name] || 0) + Number(inv.total);
    });

    const paymentMap: Record<string, number> = {};
    payments.forEach((p) => {
      const key = monthKey(p.date);
      paymentMap[key] = (paymentMap[key] || 0) + Number(p.amount);
    });

    return {
      monthlySales: Object.entries(salesMap).map(([month, v]) => ({ month, ...v })) as MonthlySales[],
      monthlyInvoices: Object.entries(invoiceCountMap).map(([month, facturas]) => ({ month, facturas })) as MonthlyInvoices[],
      paymentsByMonth: Object.entries(paymentMap).map(([month, pagos]) => ({ month, pagos })) as MonthlyPayments[],
      invoicesByStatus: Object.entries(statusMap).map(([estado, cantidad]) => ({ estado, cantidad })) as StatusCount[],
      topClients: Object.entries(clientMap)
        .map(([cliente, total]) => ({ cliente, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5) as TopClient[],
    };
  },
};
