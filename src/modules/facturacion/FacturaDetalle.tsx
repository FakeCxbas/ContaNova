import { useEffect, useMemo, useState, type ClipboardEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  Banknote,
  Building2,
  CreditCard,
  DollarSign,
  Download,
  ExternalLink,
  FileImage,
  FileText,
  FileCheck2,
  Loader2,
  Mail,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Send,
  ZoomIn,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { BrandMark } from "@/components/branding/BrandMark";
import { InvoiceStatusBadge } from "@/components/status/InvoiceStatusBadge";
import { useToast } from "@/hooks/use-toast";
import { buildPaymentNote, isPaymentEvidenceImage, parsePaymentNote } from "@/lib/payment-evidence";
import { getInvoiceDeliveryStatusMeta, getInvoiceStatusMeta } from "@/lib/invoice-status";
import { getEcuadorDateString } from "@/lib/date";
import { useClient } from "@/services/clients";
import { useCompany } from "@/services/companies";
import { useEntityActivity } from "@/services/activity";
import { activityService } from "@/services/activityService";
import { invoiceEmailService } from "@/services/invoiceEmailService";
import { DOCUMENT_TYPES, type DocumentType } from "@/services/invoiceService";
import { useInvoice, useInvoiceItems, useUpdateInvoice } from "@/services/invoices";
import { useCreatePayment, usePayments } from "@/services/payments";
import { paymentService } from "@/services/paymentService";
import { sriElectronicBillingService } from "@/services/sriElectronicBillingService";
import { useNotifications } from "@/stores/notificationStore";
import { downloadInvoicePdf, generateInvoicePdfBlob, type InvoicePdfPayload } from "@/utils/exportUtils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Ocurrio un error inesperado.";

const methodLabels: Record<string, { label: string; icon: typeof DollarSign }> = {
  efectivo: { label: "Efectivo", icon: Banknote },
  transferencia: { label: "Transferencia", icon: Building2 },
  tarjeta: { label: "Tarjeta", icon: CreditCard },
};

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("No se pudo codificar el PDF."));
        return;
      }
      const base64 = reader.result.split(",")[1];
      if (!base64) {
        reject(new Error("No se pudo codificar el PDF."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el PDF."));
    reader.readAsDataURL(blob);
  });

export default function FacturaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: invoice, isLoading: loadingInvoice } = useInvoice(id);
  const { data: items = [] } = useInvoiceItems(id);
  const { data: payments = [] } = usePayments(id);
  const { data: client } = useClient(invoice?.client_id ?? undefined);
  const { data: company } = useCompany();
  const { data: activity = [] } = useEntityActivity("factura", id, 20);
  const createPayment = useCreatePayment();
  const updateInvoice = useUpdateInvoice();

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentDate, setPaymentDate] = useState(getEcuadorDateString());
  const [paymentMethod, setPaymentMethod] = useState("transferencia");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentEvidence, setPaymentEvidence] = useState<File | null>(null);
  const [paymentEvidencePreview, setPaymentEvidencePreview] = useState<string | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [selectedPaymentHistoryEvidence, setSelectedPaymentHistoryEvidence] = useState<{
    evidence: {
      url: string;
      name: string;
      type: string;
    };
    note: string;
    date: string;
    amount: number;
    methodLabel: string;
  } | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewImageLoaded, setPreviewImageLoaded] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emittingSri, setEmittingSri] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
  const [pdfPreviewError, setPdfPreviewError] = useState("");
  const [pdfPreviewVersion, setPdfPreviewVersion] = useState(0);

  const documentType = (invoice?.document_type || "factura") as DocumentType;
  const documentLabel = DOCUMENT_TYPES[documentType]?.label || "Factura";
  const documentLabelLower = documentLabel.toLowerCase();
  const usesSri = documentType !== "proforma";
  const status = getInvoiceStatusMeta(invoice?.status);
  const deliveryStatus = getInvoiceDeliveryStatusMeta(invoice?.delivery_status);

  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const balance = Number(invoice?.total || 0) - totalPaid;
  const paymentStatus = balance <= 0 ? "Pagada" : totalPaid > 0 ? "Parcialmente pagada" : "Pendiente";
  const paymentStatusClass = balance <= 0
    ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400"
    : totalPaid > 0
      ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
    : "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400";
  const sriMessages = Array.isArray(invoice?.sri_messages)
    ? invoice.sri_messages.map((item) => String(item))
    : [];
  const sriStatusLabel = invoice?.sri_status
    ? invoice.sri_status.replaceAll("_", " ")
    : "Sin emitir";
  const sriStatusClass = invoice?.sri_status === "autorizada"
    ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
    : invoice?.sri_status === "pendiente_firma"
      ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400";

  const invoicePdfPayload = useMemo<InvoicePdfPayload>(() => ({
    company: {
      name: company?.name || "ContaNova",
      ruc: company?.ruc,
      address: company?.address,
      email: company?.email,
      phone: company?.phone,
      establishment: company?.establecimiento,
      emissionPoint: company?.punto_emision,
      accountingRequired: false,
      logoUrl: company?.logo_url,
    },
    client: {
      name: invoice?.client_name || "Cliente",
      identification: client?.identification,
      address: client?.address,
      email: client?.email,
      phone: client?.phone,
    },
    invoice: {
      number: invoice?.number || "PENDIENTE",
      date: invoice?.date || getEcuadorDateString(),
      type: documentLabel,
      status: status.label,
      subtotal: Number(invoice?.subtotal || 0),
      iva: Number(invoice?.iva || 0),
      total: Number(invoice?.total || 0),
      paymentStatus,
      deliveryStatus: deliveryStatus.label,
      totalPaid,
      balance: Math.max(0, balance),
      sriEnvironment: invoice?.sri_environment,
      sriAccessKey: invoice?.sri_access_key,
      sriAuthorizationNumber: invoice?.sri_authorization_number,
      sriAuthorizedAt: invoice?.sri_authorized_at,
    },
    items: items.map((item) => ({
      name: item.product_name,
      quantity: item.quantity,
      price: Number(item.price),
      iva: Number(item.iva),
      subtotal: item.quantity * Number(item.price),
    })),
  }), [balance, client?.address, client?.email, client?.identification, client?.phone, company?.address, company?.email, company?.establecimiento, company?.logo_url, company?.name, company?.phone, company?.punto_emision, company?.ruc, deliveryStatus.label, documentLabel, invoice?.client_name, invoice?.date, invoice?.iva, invoice?.number, invoice?.sri_access_key, invoice?.sri_authorization_number, invoice?.sri_authorized_at, invoice?.sri_environment, invoice?.subtotal, invoice?.total, items, paymentStatus, status.label, totalPaid]);

  useEffect(() => {
    setEmailRecipient(client?.email || "");
  }, [client?.email]);

  useEffect(() => {
    if (!invoice) return;
    setEmailSubject(`${documentLabel} ${invoice.number} - ${company?.name || "ContaNova"}`);
    setEmailMessage(`Te compartimos tu ${documentLabelLower} en PDF. Si necesitas una correccion o soporte, puedes responder a este correo.`);
  }, [company?.name, documentLabel, documentLabelLower, invoice]);

  useEffect(() => {
    if (!paymentEvidence || !isPaymentEvidenceImage(paymentEvidence.type)) {
      setPaymentEvidencePreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(paymentEvidence);
    setPaymentEvidencePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [paymentEvidence]);

  useEffect(() => {
    if (!invoice) return;

    let cancelled = false;
    let objectUrl: string | null = null;
    setPdfPreviewLoading(true);
    setPdfPreviewError("");

    void generateInvoicePdfBlob(invoicePdfPayload)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfPreviewUrl(objectUrl);
      })
      .catch((error) => {
        if (cancelled) return;
        setPdfPreviewUrl(null);
        setPdfPreviewError(getErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setPdfPreviewLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [invoice, invoicePdfPayload, pdfPreviewVersion]);

  const setSelectedPaymentEvidence = (file: File | null) => {
    setPaymentEvidence(file);
  };

  const handlePaymentEvidencePaste = (event: ClipboardEvent<HTMLTextAreaElement | HTMLDivElement>) => {
    const fileItem = Array.from(event.clipboardData.items).find((item) => item.kind === "file");
    const file = fileItem?.getAsFile();

    if (!file) return;

    event.preventDefault();
    setSelectedPaymentEvidence(file);
    toast({
      title: "Comprobante pegado",
      description: `${file.name || "Imagen"} listo para adjuntarse al pago.`, 
    });
  };

  if (loadingInvoice) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Factura no encontrada.</p>
        <Button variant="outline" onClick={() => navigate("/app/facturacion")}>Volver</Button>
      </div>
    );
  }

  const handleDownloadPdf = async () => {
    try {
      await downloadInvoicePdf(invoicePdfPayload, `${documentType}_${invoice.number}`);
    } catch (error) {
      toast({ title: "No se pudo generar el PDF", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const handleSendInvoiceEmail = async () => {
    const recipient = emailRecipient.trim();
    if (!recipient) {
      toast({ title: "Correo requerido", description: `Ingresa el correo al que quieres enviar la ${documentLabelLower}.`, variant: "destructive" });
      return;
    }

    setSendingEmail(true);
    try {
      const pdfBlob = await generateInvoicePdfBlob(invoicePdfPayload);
      const pdfBase64 = await blobToBase64(pdfBlob);
      const result = await invoiceEmailService.send({
        recipientEmail: recipient,
        recipientName: client?.name || invoice.client_name,
        subject: emailSubject.trim() || `${documentLabel} ${invoice.number}`,
        message: emailMessage.trim(),
        documentLabel: documentLabelLower,
        invoiceNumber: invoice.number,
        companyName: company?.name || "ContaNova",
        pdfBase64,
        filename: `${documentType}_${invoice.number}.pdf`,
      });

      await updateInvoice.mutateAsync({
        id: invoice.id,
        delivery_status: result?.simulated ? "preparada" : "enviada",
        email_sent_at: result?.simulated ? null : new Date().toISOString(),
        email_recipient: recipient,
      });

      if (company?.id) {
        await activityService.log({
          companyId: company.id,
          action: "enviar_factura",
          entityType: "factura",
          entityId: invoice.id,
          description: result?.simulated
            ? `Preparo la ${documentLabelLower} ${invoice.number} para envio a ${recipient}.`
            : `Envio la ${documentLabelLower} ${invoice.number} por correo a ${recipient}.`,
        });
      }

      toast({
        title: result?.simulated ? `${documentLabel} preparada` : `${documentLabel} enviada`,
        description: result?.simulated
          ? `Modo demo activo: se genero el PDF, pero no se envio correo real a ${recipient}.`
          : `El correo salio hacia ${recipient}.`,
      });
      setEmailDialogOpen(false);
    } catch (error) {
      toast({ title: "No se pudo enviar", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleRegisterPayment = async () => {
    if (createPayment.isPending || isSubmittingPayment) {
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast({ title: "Error", description: "Ingresa un monto valido.", variant: "destructive" });
      return;
    }
    if (amount > balance) {
      toast({ title: "Error", description: `El monto excede el saldo pendiente de $${balance.toFixed(2)}.`, variant: "destructive" });
      return;
    }
    if (paymentEvidence && !company?.id) {
      toast({ title: "Error", description: "No se pudo identificar la empresa para guardar el comprobante.", variant: "destructive" });
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await createPayment.mutateAsync({
        invoice_id: invoice.id,
        date: paymentDate,
        method: paymentMethod,
        amount,
        note: buildPaymentNote(
          paymentNote,
          paymentEvidence
            ? {
                url: await paymentService.uploadEvidence(company.id, paymentEvidence),
                name: paymentEvidence.name,
                type: paymentEvidence.type,
              }
            : null,
        ),
      });

      const newBalance = balance - amount;
      if (newBalance <= 0) {
        await updateInvoice.mutateAsync({ id: invoice.id, status: "pagada" });
      }
      if (company?.id) {
        await activityService.log({
          companyId: company.id,
          action: "registrar_pago",
          entityType: "factura",
          entityId: invoice.id,
          description: newBalance <= 0
            ? `Registro el pago final de la factura ${invoice.number}.`
            : `Registro un pago parcial de $${amount.toFixed(2)} para la factura ${invoice.number}.`,
        });
      }

      toast({
        title: newBalance <= 0 ? "Factura pagada" : "Pago registrado",
        description: newBalance <= 0 ? "La factura ha sido pagada en su totalidad." : `Pago de $${amount.toFixed(2)} registrado.`,
      });
      useNotifications.getState().addNotification({
        id: `payment-${invoice.id}-${Date.now()}`,
        type: "pago",
        title: newBalance <= 0 ? "Factura pagada" : "Pago recibido",
        message: newBalance <= 0
          ? `${invoice.client_name} completo el pago de ${invoice.number}.`
          : `${invoice.client_name} realizo un pago de $${amount.toFixed(2)} en ${invoice.number}.`,
      });
      setPaymentAmount("");
      setPaymentNote("");
      setSelectedPaymentEvidence(null);
      setPaymentEvidencePreview(null);
      setShowPaymentForm(false);
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleEmitSri = async () => {
    if (!invoice?.id) return;

    setEmittingSri(true);
    try {
      const result = await sriElectronicBillingService.emit({ invoiceId: invoice.id });

      await updateInvoice.mutateAsync({ id: invoice.id });

      toast({
        title: result.requiresConfiguration
          ? "XML listo, falta firma"
          : result.ok
            ? "Factura autorizada por el SRI"
            : "Respuesta del SRI recibida",
        description: result.messages[0] || `Estado: ${result.status}`,
        variant: result.ok || result.requiresConfiguration ? "default" : "destructive",
      });

      if (company?.id) {
        await activityService.log({
          companyId: company.id,
          action: "emitir_sri",
          entityType: "factura",
          entityId: invoice.id,
          description: result.ok
            ? `Autorizo la factura ${invoice.number} en el SRI.`
            : `Preparo la factura ${invoice.number} para emision SRI: ${result.status}.`,
        });
      }
    } catch (error) {
      toast({ title: "No se pudo emitir al SRI", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setEmittingSri(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/app/facturacion")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />Volver a facturacion
        </Button>
        <div className="flex flex-wrap gap-2">
          {invoice.status !== "anulada" && (
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Mail className="h-4 w-4" />Enviar por correo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enviar {documentLabelLower} en PDF</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Destinatario</Label>
                    <Input type="email" placeholder="cliente@correo.com" value={emailRecipient} onChange={(event) => setEmailRecipient(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Asunto</Label>
                    <Input value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mensaje</Label>
                    <Textarea rows={4} value={emailMessage} onChange={(event) => setEmailMessage(event.target.value)} />
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
                    Se adjuntara un PDF comercial con la {documentLabelLower} {invoice.number}. Este envio no usa la API del SRI.
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEmailDialogOpen(false)} disabled={sendingEmail}>Cancelar</Button>
                    <Button onClick={handleSendInvoiceEmail} disabled={sendingEmail} className="gap-2">
                      <Send className="h-4 w-4" />
                      {sendingEmail ? "Enviando..." : `Enviar ${documentLabelLower}`}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {invoice.status !== "anulada" && balance > 0 && (
            <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" />Registrar pago</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl overflow-x-hidden">
                <DialogHeader>
                  <DialogTitle>Registrar pago</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between rounded-lg bg-muted p-3 text-sm">
                    <span className="text-muted-foreground">Saldo pendiente</span>
                    <span className="text-lg font-bold">${balance.toFixed(2)}</span>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de pago</Label>
                    <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Metodo de pago</Label>
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
                    <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
                  </div>
                  <div className="space-y-3">
                    <Label>Nota y comprobante (opcional)</Label>
                    <div className="rounded-2xl border border-border bg-muted/10 p-3" onPaste={handlePaymentEvidencePaste}>
                      <Textarea
                        placeholder="Ej: Transferencia bancaria #12345"
                        value={paymentNote}
                        onChange={(event) => setPaymentNote(event.target.value)}
                        onPaste={handlePaymentEvidencePaste}
                        rows={3}
                        className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/70 pt-3">
                        <label
                          htmlFor="payment-evidence"
                          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                        >
                          <FileImage className="h-4 w-4" />
                          {paymentEvidence ? "Cambiar comprobante" : "Adjuntar comprobante"}
                        </label>
                        <Input
                          id="payment-evidence"
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(event) => setSelectedPaymentEvidence(event.target.files?.[0] || null)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Sube o pega con Ctrl + V una captura, foto o PDF del deposito o transferencia.
                        </p>
                        {paymentEvidence && (
                          <button
                            type="button"
                            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                            onClick={() => {
                              setSelectedPaymentEvidence(null);
                              setPaymentEvidencePreview(null);
                            }}
                          >
                            Quitar archivo
                          </button>
                        )}
                      </div>

                      {paymentEvidence && (
                        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-background/80">
                          {paymentEvidencePreview ? (
                            <img
                              src={paymentEvidencePreview}
                              alt={paymentEvidence.name}
                              className="h-44 w-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center gap-3 p-4">
                              <ExternalLink className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{paymentEvidence.name}</p>
                                <p className="text-xs text-muted-foreground">Vista previa no disponible para este formato</p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{paymentEvidence.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {Math.max(1, Math.round(paymentEvidence.size / 1024))} KB
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {paymentEvidence.type === "application/pdf" ? "PDF" : "Imagen"}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setShowPaymentForm(false)} disabled={createPayment.isPending || isSubmittingPayment}>Cancelar</Button>
                    <Button onClick={handleRegisterPayment} disabled={createPayment.isPending || isSubmittingPayment} className="gap-2">
                      {(createPayment.isPending || isSubmittingPayment) && <Loader2 className="h-4 w-4 animate-spin" />}
                      {createPayment.isPending || isSubmittingPayment ? "Registrando..." : "Registrar pago"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {invoice.status !== "anulada" && usesSri && documentType === "factura" && (
            <Button variant="outline" className="gap-2" onClick={handleEmitSri} disabled={emittingSri}>
              {emittingSri ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
              {emittingSri ? "Enviando..." : "Enviar al SRI"}
            </Button>
          )}

          <Button variant="outline" className="gap-2" onClick={handleDownloadPdf}>
            <Download className="h-4 w-4" />PDF
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />Imprimir
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Vista previa del PDF
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Revisa la representacion imprimible de {documentLabelLower} sin descargar el archivo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setPdfPreviewVersion((current) => current + 1)} disabled={pdfPreviewLoading}>
              {pdfPreviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Actualizar
            </Button>
            {pdfPreviewUrl && (
              <a
                href={pdfPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-border bg-muted/20">
            {pdfPreviewLoading && (
              <div className="flex h-[70vh] items-center justify-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Generando PDF...
              </div>
            )}
            {!pdfPreviewLoading && pdfPreviewError && (
              <div className="flex h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">No se pudo mostrar el PDF</p>
                  <p className="mt-1 text-sm text-muted-foreground">{pdfPreviewError}</p>
                </div>
                <Button variant="outline" onClick={() => setPdfPreviewVersion((current) => current + 1)}>Intentar de nuevo</Button>
              </div>
            )}
            {!pdfPreviewLoading && !pdfPreviewError && pdfPreviewUrl && (
              <iframe
                src={`${pdfPreviewUrl}#toolbar=1&navpanes=0&view=FitH`}
                title={`PDF ${invoice.number}`}
                className="h-[78vh] w-full bg-background"
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-8 p-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-1 flex items-center gap-3">
                {company?.logo_url ? (
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/40 p-1">
                    <img src={company.logo_url} alt={company.name} className="h-full w-full rounded-xl object-contain" />
                  </div>
                ) : (
                  <BrandMark />
                )}
                <span className="text-2xl font-bold">{company?.name || "Conta"}<span className="text-primary">{company?.name ? "" : "Nova"}</span></span>
              </div>
              {company && (
                <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                  <p>{company.name}</p>
                  {company.ruc && <p>RUC: {company.ruc}</p>}
                  {company.address && <p>{company.address}</p>}
                  {company.email && <p>{company.email} | {company.phone}</p>}
                </div>
              )}
            </div>
            <div className="space-y-1 text-right">
              <h2 className="text-xl font-bold">{documentLabel.toUpperCase()}</h2>
              <p className="font-mono text-sm text-muted-foreground">{invoice.number}</p>
              <p className="text-sm text-muted-foreground">Fecha: {invoice.date}</p>
              <div className="mt-2 flex justify-end gap-2">
                <InvoiceStatusBadge status={invoice.status} />
                <Badge className={deliveryStatus.className}>{deliveryStatus.label}</Badge>
                <Badge className={paymentStatusClass}>{paymentStatus}</Badge>
                {usesSri && <Badge className={sriStatusClass}>SRI: {sriStatusLabel}</Badge>}
              </div>
              {invoice.sri_access_key && (
                <p className="mt-2 max-w-xs break-all text-xs text-muted-foreground">
                  Clave de acceso: {invoice.sri_access_key}
                </p>
              )}
              {invoice.sri_authorization_number && (
                <p className="mt-1 max-w-xs break-all text-xs text-muted-foreground">
                  Autorizacion: {invoice.sri_authorization_number}
                </p>
              )}
            </div>
          </div>

          {sriMessages.length > 0 && (
            <>
              <Separator />
              <div className="rounded-xl border bg-muted/30 p-4">
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">RESPUESTA SRI</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {sriMessages.map((message, index) => (
                    <p key={`${message}-${index}`}>{message}</p>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">DATOS DEL CLIENTE</h3>
            <div className="space-y-0.5 text-sm">
              <p className="font-medium">{invoice.client_name}</p>
              {client && (
                <>
                  <p className="text-muted-foreground">Identificacion: {client.identification}</p>
                  <p className="text-muted-foreground">{client.address}</p>
                  <p className="text-muted-foreground">{client.email} | {client.phone}</p>
                </>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">DETALLE</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="w-24 text-center">Cantidad</TableHead>
                  <TableHead className="w-28 text-right">P. unitario</TableHead>
                  <TableHead className="w-20 text-center">IVA %</TableHead>
                  <TableHead className="w-28 text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">{item.product_name}</TableCell>
                    <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                    <TableCell className="text-right text-sm">${Number(item.price).toFixed(2)}</TableCell>
                    <TableCell className="text-center text-sm">{Number(item.iva)}%</TableCell>
                    <TableCell className="text-right text-sm font-medium">${(item.quantity * Number(item.price)).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${Number(invoice.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">IVA</span><span>${Number(invoice.iva).toFixed(2)}</span></div>
              <Separator />
              <div className="flex justify-between pt-1 text-lg font-bold"><span>Total</span><span>${Number(invoice.total).toFixed(2)}</span></div>
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
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5" />
            Historial de pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No hay pagos registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Comprobante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  const method = methodLabels[payment.method] || { label: payment.method, icon: DollarSign };
                  const MethodIcon = method.icon;
                  const paymentDetail = parsePaymentNote(payment.note);
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="text-sm">{payment.date}</TableCell>
                      <TableCell className="text-sm">
                        <span className="flex items-center gap-1.5">
                          <MethodIcon className="h-4 w-4 text-muted-foreground" />
                          {method.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-green-600 dark:text-green-400">+${Number(payment.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{paymentDetail.note || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {paymentDetail.evidence ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 text-primary transition-colors hover:text-primary/80 hover:underline"
                            onClick={() => {
                              setSelectedPaymentHistoryEvidence({
                                evidence: paymentDetail.evidence,
                                note: paymentDetail.note,
                                date: payment.date,
                                amount: Number(payment.amount),
                                methodLabel: method.label,
                              });
                              setPreviewZoom(1);
                              setPreviewImageLoaded(false);
                            }}
                          >
                            {isPaymentEvidenceImage(paymentDetail.evidence.type) ? (
                              <FileImage className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                            <span className="max-w-[180px] truncate">{paymentDetail.evidence.name}</span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedPaymentHistoryEvidence)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPaymentHistoryEvidence(null);
            setPreviewZoom(1);
            setPreviewImageLoaded(false);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vista previa del comprobante</DialogTitle>
          </DialogHeader>
          {selectedPaymentHistoryEvidence && (
            <div className="space-y-4 pt-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedPaymentHistoryEvidence.evidence.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedPaymentHistoryEvidence.evidence.type === "application/pdf" ? "Documento PDF" : "Imagen adjunta al pago"} · {selectedPaymentHistoryEvidence.methodLabel} · {selectedPaymentHistoryEvidence.date}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isPaymentEvidenceImage(selectedPaymentHistoryEvidence.evidence.type) && (
                    <>
                      <Button type="button" variant="outline" size="icon" onClick={() => setPreviewZoom((current) => Math.max(1, Number((current - 0.25).toFixed(2))))}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="icon" onClick={() => setPreviewZoom((current) => Math.min(4, Number((current + 0.25).toFixed(2))))}>
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="icon" onClick={() => setPreviewZoom(1)}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <a
                    href={selectedPaymentHistoryEvidence.evidence.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir original
                  </a>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="overflow-hidden rounded-2xl border border-border bg-muted/20">
                  {isPaymentEvidenceImage(selectedPaymentHistoryEvidence.evidence.type) ? (
                    <div className="relative flex h-[70vh] items-center justify-center overflow-auto bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_60%)]">
                      {!previewImageLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      <img
                        src={selectedPaymentHistoryEvidence.evidence.url}
                        alt={selectedPaymentHistoryEvidence.evidence.name}
                        loading="eager"
                        decoding="async"
                        onLoad={() => setPreviewImageLoaded(true)}
                        className="max-w-none cursor-zoom-in rounded-xl object-contain transition-transform duration-200 ease-out"
                        style={{ transform: `scale(${previewZoom})`, transformOrigin: "center center" }}
                        onClick={() => setPreviewZoom((current) => (current >= 2 ? 1 : 2))}
                      />
                    </div>
                  ) : (
                    <iframe
                      src={selectedPaymentHistoryEvidence.evidence.url}
                      title={selectedPaymentHistoryEvidence.evidence.name}
                      className="h-[70vh] w-full bg-background"
                    />
                  )}
                </div>

                <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Mensaje</p>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      {selectedPaymentHistoryEvidence.note || "Sin nota adicional para este pago."}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Monto</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        +${selectedPaymentHistoryEvidence.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Metodo</span>
                      <span>{selectedPaymentHistoryEvidence.methodLabel}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Fecha</span>
                      <span>{selectedPaymentHistoryEvidence.date}</span>
                    </div>
                    {isPaymentEvidenceImage(selectedPaymentHistoryEvidence.evidence.type) && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Zoom</span>
                        <span>{Math.round(previewZoom * 100)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Actividad de la factura
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Todavia no hay eventos registrados para esta factura.</p>
          ) : (
            <div className="space-y-4">
              {activity.map((entry) => (
                <div key={entry.id} className="flex gap-3 border-b border-border/60 pb-4 last:border-b-0 last:pb-0">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{entry.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.user_name || "Sistema"} · {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}




