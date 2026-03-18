import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, Download, Plus, DollarSign, CreditCard, Banknote, Building2, FileText as FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/stores/notificationStore";
import { useInvoice, useInvoiceItems } from "@/services/invoices";
import { usePayments, useCreatePayment } from "@/services/payments";
import { useClient } from "@/services/clients";
import { useCompany } from "@/services/companies";
import { DOCUMENT_TYPES, type DocumentType } from "@/services/invoiceService";
import { exportToPDF } from "@/utils/exportUtils";

const statusConfig: Record<string, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-muted text-muted-foreground border-muted" },
  enviada: { label: "Enviada", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  pagada: { label: "Pagada", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
  anulada: { label: "Anulada", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
};

const methodLabels: Record<string, { label: string; icon: typeof DollarSign }> = {
  efectivo: { label: "Efectivo", icon: Banknote },
  transferencia: { label: "Transferencia", icon: Building2 },
  tarjeta: { label: "Tarjeta", icon: CreditCard },
};

export default function FacturaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: invoice, isLoading: loadingInv } = useInvoice(id);
  const { data: items = [] } = useInvoiceItems(id);
  const { data: payments = [] } = usePayments(id);
  const { data: client } = useClient(invoice?.client_id ?? undefined);
  const { data: company } = useCompany();
  const createPayment = useCreatePayment();

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("transferencia");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  if (loadingInv) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Factura no encontrada</p>
        <Button variant="outline" onClick={() => navigate("/app/facturacion")}>Volver</Button>
      </div>
    );
  }

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = Number(invoice.total) - totalPaid;
  const paymentStatus = balance <= 0 ? "Pagada" : totalPaid > 0 ? "Parcialmente pagada" : "Pendiente";
  const paymentStatusClass = balance <= 0
    ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400"
    : totalPaid > 0
      ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400";

  const handleRegisterPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Error", description: "Ingresa un monto válido.", variant: "destructive" });
      return;
    }
    if (amount > balance) {
      toast({ title: "Error", description: `El monto excede el saldo pendiente de $${balance.toFixed(2)}.`, variant: "destructive" });
      return;
    }
    try {
      await createPayment.mutateAsync({
        invoice_id: invoice.id,
        date: paymentDate,
        method: paymentMethod,
        amount,
        note: paymentNote,
      });
      const newBalance = balance - amount;
      toast({
        title: newBalance <= 0 ? "Factura pagada" : "Pago registrado",
        description: newBalance <= 0 ? "La factura ha sido pagada en su totalidad." : `Pago de $${amount.toFixed(2)} registrado.`,
      });
      useNotifications.getState().addNotification({
        type: "pago",
        title: newBalance <= 0 ? "Factura pagada" : "Pago recibido",
        message: newBalance <= 0
          ? `${invoice.client_name} completó el pago de la factura ${invoice.number}.`
          : `Pago de $${amount.toFixed(2)} recibido de ${invoice.client_name}.`,
      });
      setPaymentAmount("");
      setPaymentNote("");
      setShowPaymentForm(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/app/facturacion")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />Volver a facturación
        </Button>
        <div className="flex gap-2">
          {invoice.status !== "anulada" && balance > 0 && (
            <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" />Registrar pago</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar pago</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between text-sm p-3 rounded-lg bg-muted">
                    <span className="text-muted-foreground">Saldo pendiente</span>
                    <span className="font-bold text-lg">${balance.toFixed(2)}</span>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de pago</Label>
                    <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Método de pago</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Monto</Label>
                    <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nota (opcional)</Label>
                    <Textarea placeholder="Ej: Transferencia bancaria #12345" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} rows={2} />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="outline" onClick={() => setShowPaymentForm(false)}>Cancelar</Button>
                    <Button onClick={handleRegisterPayment} disabled={createPayment.isPending}>
                      {createPayment.isPending ? "Registrando..." : "Registrar pago"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="outline" className="gap-2" onClick={() => {
            const dt = ((invoice as any).document_type || "factura") as DocumentType;
            const dtLabel = DOCUMENT_TYPES[dt]?.label || "Factura";
            const headers = ["Producto", "Cantidad", "P. Unitario", "IVA %", "Subtotal"];
            const rows = items.map(item => [
              item.product_name,
              String(item.quantity),
              `$${Number(item.price).toFixed(2)}`,
              `${Number(item.iva)}%`,
              `$${(item.quantity * Number(item.price)).toFixed(2)}`,
            ]);
            rows.push(["", "", "", "Subtotal:", `$${Number(invoice.subtotal).toFixed(2)}`]);
            rows.push(["", "", "", "IVA:", `$${Number(invoice.iva).toFixed(2)}`]);
            rows.push(["", "", "", "TOTAL:", `$${Number(invoice.total).toFixed(2)}`]);
            exportToPDF(
              `${dtLabel} ${invoice.number}`,
              headers,
              rows,
              `${dt}_${invoice.number}`,
              { subtitle: `Cliente: ${invoice.client_name} — Fecha: ${invoice.date}` }
            );
          }}>
            <Download className="h-4 w-4" />PDF
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />Imprimir
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-8 space-y-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">C</span>
                </div>
                <span className="text-2xl font-bold">Conta<span className="text-primary">Nova</span></span>
              </div>
              {company && (
                <div className="text-sm text-muted-foreground mt-2 space-y-0.5">
                  <p>{company.name}</p>
                  {company.ruc && <p>RUC: {company.ruc}</p>}
                  {company.address && <p>{company.address}</p>}
                  {company.email && <p>{company.email} | {company.phone}</p>}
                </div>
              )}
            </div>
            <div className="text-right space-y-1">
              {(() => {
                const dt = ((invoice as any).document_type || "factura") as DocumentType;
                const dtLabel = DOCUMENT_TYPES[dt]?.label || "Factura";
                return <h2 className="text-xl font-bold">{dtLabel.toUpperCase()}</h2>;
              })()}
              <p className="text-sm text-muted-foreground font-mono">{invoice.number}</p>
              <p className="text-sm text-muted-foreground">Fecha: {invoice.date}</p>
              <div className="flex gap-2 justify-end mt-2">
                <Badge className={statusConfig[invoice.status]?.className}>{statusConfig[invoice.status]?.label}</Badge>
                <Badge className={paymentStatusClass}>{paymentStatus}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">DATOS DEL CLIENTE</h3>
            <div className="text-sm space-y-0.5">
              <p className="font-medium">{invoice.client_name}</p>
              {client && (
                <>
                  <p className="text-muted-foreground">Identificación: {client.identification}</p>
                  <p className="text-muted-foreground">{client.address}</p>
                  <p className="text-muted-foreground">{client.email} | {client.phone}</p>
                </>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">DETALLE</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center w-24">Cantidad</TableHead>
                  <TableHead className="text-right w-28">P. Unitario</TableHead>
                  <TableHead className="text-center w-20">IVA %</TableHead>
                  <TableHead className="text-right w-28">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">{item.product_name}</TableCell>
                    <TableCell className="text-sm text-center">{item.quantity}</TableCell>
                    <TableCell className="text-sm text-right">${Number(item.price).toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-center">{Number(item.iva)}%</TableCell>
                    <TableCell className="text-sm text-right font-medium">${(item.quantity * Number(item.price)).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${Number(invoice.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">IVA (15%)</span><span>${Number(invoice.iva).toFixed(2)}</span></div>
              <Separator />
              <div className="flex justify-between font-bold text-lg pt-1"><span>Total</span><span>${Number(invoice.total).toFixed(2)}</span></div>
              <Separator />
              <div className="flex justify-between text-green-600 dark:text-green-400"><span>Total pagado</span><span>${totalPaid.toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold">
                <span className={balance > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}>Saldo pendiente</span>
                <span className={balance > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}>${Math.max(0, balance).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><DollarSign className="h-5 w-5" />Historial de pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No hay pagos registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Nota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map(payment => {
                  const m = methodLabels[payment.method] || { label: payment.method, icon: DollarSign };
                  const MethodIcon = m.icon;
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="text-sm">{payment.date}</TableCell>
                      <TableCell className="text-sm">
                        <span className="flex items-center gap-1.5"><MethodIcon className="h-4 w-4 text-muted-foreground" />{m.label}</span>
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium text-green-600 dark:text-green-400">+${Number(payment.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{payment.note || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
