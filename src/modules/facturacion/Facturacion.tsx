import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  FileDown,
  FileText,
  FileUp,
  Loader2,
  MoreHorizontal,
  Plus,
  Shield,
  Truck,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ExportMenu } from "@/components/ExportMenu";
import { InvoiceStatusBadge } from "@/components/status/InvoiceStatusBadge";
import { useToast } from "@/hooks/use-toast";
import { getInvoiceDeliveryStatusMeta, getInvoiceStatusMeta, normalizeInvoiceStatus } from "@/lib/invoice-status";
import { useClients } from "@/services/clients";
import { useCompany, useCompanyId } from "@/services/companies";
import { activityService } from "@/services/activityService";
import { invoiceEmailService } from "@/services/invoiceEmailService";
import { invoiceService, DOCUMENT_TYPES, type DocumentType, type Invoice } from "@/services/invoiceService";
import { invoiceWhatsappService } from "@/services/invoiceWhatsappService";
import { sriElectronicBillingService } from "@/services/sriElectronicBillingService";
import { useCreateInvoice, useInvoices, useUpdateInvoice } from "@/services/invoices";
import { useProducts, useUpdateProduct } from "@/services/products";
import { useNotifications } from "@/stores/notificationStore";
import { exportInvoicesToCSV, exportInvoicesToExcel, exportInvoicesToPDF, generateInvoicePdfBlob, type InvoicePdfPayload } from "@/utils/exportUtils";
import { getEcuadorDateString } from "@/lib/date";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Ocurrio un error inesperado.";

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

const normalizePercentage = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(value, 100);
};

const docTypeIcons: Record<DocumentType, typeof FileText> = {
  proforma: FileText,
  factura: FileText,
  nota_credito: FileDown,
  nota_debito: FileUp,
  retencion: Shield,
  guia_remision: Truck,
};

interface LineItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  iva: number;
}

export default function Facturacion() {
  const isCreatingInvoiceRef = useRef(false);
  const [showForm, setShowForm] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>("factura");
  const [selectedDate, setSelectedDate] = useState(getEcuadorDateString());
  const [searchNumber, setSearchNumber] = useState("");
  const [filterClient, setFilterClient] = useState("all");
  const [filterDocType, setFilterDocType] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: clients = [] } = useClients();
  const { data: products = [] } = useProducts();
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: companyId } = useCompanyId();
  const { data: company } = useCompany();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const updateProduct = useUpdateProduct();

  const addLine = () => {
    const query = productSearch.trim();
    const product = products.find((item) => item.active && item.name.toLowerCase() === query.toLowerCase());

    setLines((current) => [
      ...current,
      product
        ? {
            productId: product.id,
            name: product.name,
            quantity: 1,
            price: Number(product.price),
            iva: Number(product.iva),
          }
        : {
            productId: "",
            name: query,
            quantity: 1,
            price: 0,
            iva: 15,
          },
    ]);
    setProductSearch("");
  };

  const updateLine = (index: number, field: keyof LineItem, value: string | number) => {
    setLines((current) => {
      const updated = [...current];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "productId") {
        const product = products.find((item) => item.id === value);
        if (product) {
          updated[index].name = product.name;
          updated[index].price = Number(product.price);
          updated[index].iva = Number(product.iva);
        }
      }
      if (field === "quantity") {
        updated[index].quantity = Math.max(1, Number(value) || 1);
      }
      if (field === "price") {
        updated[index].price = Math.max(0, Number(value) || 0);
      }
      if (field === "iva") {
        updated[index].iva = normalizePercentage(Number(value));
      }
      return updated;
    });
  };

  const removeLine = (index: number) => setLines((current) => current.filter((_, currentIndex) => currentIndex !== index));

  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
  const ivaTotal = lines.reduce((sum, line) => sum + line.quantity * line.price * (line.iva / 100), 0);
  const total = subtotal + ivaTotal;

  const docTypeConfig = DOCUMENT_TYPES[selectedDocType];
  const needsProducts = selectedDocType !== "retencion" && selectedDocType !== "guia_remision";

  const emitInvoice = async () => {
    if (isCreatingInvoiceRef.current || isCreatingInvoice || createInvoice.isPending) {
      return;
    }

    if (needsProducts && lines.length === 0) {
      toast({ title: "Error", description: "Agrega al menos un producto.", variant: "destructive" });
      return;
    }

    if (needsProducts && lines.some((line) => !line.name.trim())) {
      toast({ title: "Descripcion requerida", description: "Escribe la descripcion de cada producto o servicio.", variant: "destructive" });
      return;
    }

    if (!companyId) {
      toast({ title: "Error", description: "No se pudo obtener la empresa.", variant: "destructive" });
      return;
    }

    const client = clients.find((item) => item.id === selectedClientId);

    if ((selectedDocType === "factura" || selectedDocType === "proforma") && !client?.name) {
      toast({
        title: "Cliente incompleto",
        description: `Selecciona o crea un cliente antes de generar la ${docTypeConfig.label.toLowerCase()}.`,
        variant: "destructive",
      });
      return;
    }

    if (needsProducts) {
      const stockIssues = lines.filter((line) => {
        const product = products.find((item) => item.id === line.productId);
        return product && product.type === "Bien" && line.quantity > product.stock;
      });

      if (stockIssues.length > 0) {
        toast({
          title: "Stock insuficiente",
          description: `${stockIssues.map((line) => line.name).join(", ")} no tiene stock suficiente.`,
          variant: "destructive",
        });
        return;
      }
    }

    isCreatingInvoiceRef.current = true;
    setIsCreatingInvoice(true);
    try {
      const nextNumber = await invoiceService.getNextNumber(companyId, selectedDocType);
      const createdInvoice = await createInvoice.mutateAsync({
        client_id: selectedClientId || null,
        client_name: client?.name || "Cliente general",
        number: nextNumber,
        date: selectedDate,
        subtotal,
        iva: ivaTotal,
        total,
        status: "emitida",
        document_type: selectedDocType,
        items: lines.map((line) => ({
          product_id: line.productId || null,
          product_name: line.name,
          quantity: line.quantity,
          price: line.price,
          iva: line.iva,
        })),
      });

      if (needsProducts && selectedDocType === "factura") {
        for (const line of lines) {
          const product = products.find((item) => item.id === line.productId);
          if (product && product.type === "Bien") {
            const updatedStock = product.stock - line.quantity;
            await updateProduct.mutateAsync({ id: product.id, stock: updatedStock });
          }
        }
      }

      await activityService.log({
        companyId,
        action: "crear_factura",
        entityType: "factura",
        entityId: createdInvoice.id,
        description: `Creo ${docTypeConfig.label.toLowerCase()} ${createdInvoice.number} por $${Number(createdInvoice.total).toFixed(2)}.`,
      });

      let effectiveInvoice: Invoice = createdInvoice;
      let autoSriMessage = "";
      if (selectedDocType === "factura" && company?.auto_send_invoice_sri) {
        try {
          const sriResult = await sriElectronicBillingService.emit({ invoiceId: createdInvoice.id });
          effectiveInvoice = {
            ...effectiveInvoice,
            status: sriResult.status === "autorizada" ? "emitida" : effectiveInvoice.status,
            sri_environment: sriResult.environment || effectiveInvoice.sri_environment,
            sri_status: sriResult.status,
            sri_access_key: sriResult.accessKey || effectiveInvoice.sri_access_key,
            sri_authorization_number: sriResult.authorizationNumber || effectiveInvoice.sri_authorization_number,
            sri_authorized_at: sriResult.authorizedAt || effectiveInvoice.sri_authorized_at,
            sri_messages: sriResult.messages,
          };

          await activityService.log({
            companyId,
            action: "emitir_sri",
            entityType: "factura",
            entityId: createdInvoice.id,
            description: sriResult.ok
              ? `Envio automaticamente la factura ${createdInvoice.number} al SRI y fue autorizada.`
              : `Preparo automaticamente la factura ${createdInvoice.number} para SRI: ${sriResult.status}.`,
          });

          autoSriMessage = sriResult.ok
            ? " Se envio automaticamente al SRI y fue autorizada."
            : ` No se autorizo automaticamente en SRI: ${sriResult.messages.join(" ")}`;
        } catch (sriError) {
          autoSriMessage = ` No se pudo enviar automaticamente al SRI: ${getErrorMessage(sriError)}`;
        }
      } else if (selectedDocType === "factura") {
        autoSriMessage = " Autoenvio SRI desactivado.";
      }

      let autoEmailMessage = "";
      const creationMessage = `${docTypeConfig.label} ${nextNumber} creada correctamente.`;
      if (selectedDocType === "factura" && company?.auto_send_invoice_email) {
        if (!client?.email) {
          autoEmailMessage = " No se envio automaticamente porque el cliente no tiene correo.";
        } else {
          try {
            const commercialStatus = normalizeInvoiceStatus(effectiveInvoice.status);
            const deliveryStatus = getInvoiceDeliveryStatusMeta(effectiveInvoice.delivery_status);
            const pdfPayload: InvoicePdfPayload = {
              company: {
                name: company.name || "ContaNova",
                ruc: company.ruc,
                address: company.address,
                email: company.email,
                phone: company.phone,
                establishment: company.establecimiento,
                emissionPoint: company.punto_emision,
                accountingRequired: false,
                logoUrl: company.logo_url,
              },
              client: {
                name: client.name || createdInvoice.client_name,
                identification: client.identification,
                address: client.address,
                email: client.email,
                phone: client.phone,
              },
              invoice: {
                number: effectiveInvoice.number,
                date: effectiveInvoice.date,
                type: DOCUMENT_TYPES[selectedDocType]?.label || "Factura",
                status: getInvoiceStatusMeta(commercialStatus).label,
                subtotal: Number(effectiveInvoice.subtotal),
                iva: Number(effectiveInvoice.iva),
                total: Number(effectiveInvoice.total),
                paymentStatus: "Pendiente",
                deliveryStatus: deliveryStatus.label,
                totalPaid: 0,
                balance: Number(effectiveInvoice.total),
                sriStatus: effectiveInvoice.sri_status,
                sriAccessKey: effectiveInvoice.sri_access_key,
                sriAuthorizationNumber: effectiveInvoice.sri_authorization_number,
                sriAuthorizedAt: effectiveInvoice.sri_authorized_at,
                sriEnvironment: effectiveInvoice.sri_environment,
              },
              items: lines.map((line) => ({
                name: line.name,
                quantity: line.quantity,
                price: line.price,
                iva: line.iva,
                subtotal: line.quantity * line.price,
              })),
            };
            const pdfBlob = await generateInvoicePdfBlob(pdfPayload);
            const pdfBase64 = await blobToBase64(pdfBlob);
            const emailResult = await invoiceEmailService.send({
              recipientEmail: client.email,
              recipientName: client.name,
              subject: `Factura ${effectiveInvoice.number} - ${company.name || "ContaNova"}`,
              message: "Te compartimos tu factura en PDF. Si necesitas una correccion o soporte, puedes responder a este correo.",
              documentLabel: "factura",
              invoiceNumber: effectiveInvoice.number,
              companyName: company.name || "ContaNova",
              pdfBase64,
              filename: `factura_${effectiveInvoice.number}.pdf`,
            });

            await updateInvoice.mutateAsync({
              id: effectiveInvoice.id,
              delivery_status: emailResult?.simulated ? "preparada" : "enviada",
              email_sent_at: emailResult?.simulated ? null : new Date().toISOString(),
              email_recipient: client.email,
            });
            effectiveInvoice = {
              ...effectiveInvoice,
              delivery_status: emailResult?.simulated ? "preparada" : "enviada",
              email_sent_at: emailResult?.simulated ? null : new Date().toISOString(),
              email_recipient: client.email,
            };
            await activityService.log({
              companyId,
              action: "enviar_factura",
              entityType: "factura",
              entityId: effectiveInvoice.id,
              description: emailResult?.simulated
                ? `Preparo el envio automatico de la factura ${effectiveInvoice.number} para ${client.email}.`
                : `Envio automaticamente la factura ${effectiveInvoice.number} a ${client.email}.`,
            });

            autoEmailMessage = emailResult?.simulated
              ? " El envio automatico quedo en modo demo."
              : ` Se envio automaticamente a ${client.email}.`;
          } catch (emailError) {
            autoEmailMessage = ` No se pudo enviar automaticamente: ${getErrorMessage(emailError)}`;
          }
        }
      } else if (selectedDocType === "factura") {
        autoEmailMessage = " Autoenvio desactivado: aun no se ha enviado por correo.";
      }

      let autoWhatsappMessage = "";
      if (selectedDocType === "factura" && company?.whatsapp_enabled && company?.auto_send_invoice_whatsapp) {
        try {
          const whatsappResult = await invoiceWhatsappService.send({ invoiceId: effectiveInvoice.id });
          await activityService.log({
            companyId,
            action: "enviar_whatsapp",
            entityType: "factura",
            entityId: effectiveInvoice.id,
            description: whatsappResult?.simulated
              ? `Simulo el envio automatico por WhatsApp de la factura ${effectiveInvoice.number}.`
              : `Envio automaticamente la factura ${effectiveInvoice.number} por WhatsApp.`,
          });
          autoWhatsappMessage = whatsappResult?.simulated
            ? " WhatsApp quedo simulado."
            : " Se envio automaticamente por WhatsApp.";
        } catch (whatsappError) {
          autoWhatsappMessage = ` No se pudo enviar WhatsApp automaticamente: ${getErrorMessage(whatsappError)}`;
        }
      } else if (selectedDocType === "factura") {
        autoWhatsappMessage = " Autoenvio WhatsApp desactivado.";
      }

      setLines([]);
      setProductSearch("");
      setSelectedClientId("");
      setSelectedDocType("factura");
      setSelectedDate(getEcuadorDateString());
      setShowForm(false);

      toast({
        title: `${docTypeConfig.label} creada`,
        description: `${creationMessage}${autoSriMessage}${autoEmailMessage}${autoWhatsappMessage}`,
      });
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      isCreatingInvoiceRef.current = false;
      setIsCreatingInvoice(false);
    }
  };

  const markAsPaid = async (id: string) => {
    await updateInvoice.mutateAsync({ id, status: "pagada" });
    const invoice = invoices.find((item) => item.id === id);
    if (companyId) {
      await activityService.log({
        companyId,
        action: "registrar_pago",
        entityType: "factura",
        entityId: id,
        description: "Marco la factura como pagada desde el listado.",
      });
    }
    if (invoice) {
      useNotifications.getState().addNotification({
        id: `payment-${invoice.id}-${Date.now()}`,
        type: "pago",
        title: "Factura pagada",
        message: `${invoice.client_name} completo el pago de ${invoice.number}.`,
      });
    }
    toast({ title: "Comprobante actualizado", description: "Marcado como pagado." });
  };

  const annulInvoice = async (id: string) => {
    await updateInvoice.mutateAsync({ id, status: "anulada" });
    if (companyId) {
      await activityService.log({
        companyId,
        action: "editar_factura",
        entityType: "factura",
        entityId: id,
        description: "Anulo un comprobante desde el listado.",
      });
    }
    toast({ title: "Comprobante anulado", description: "El comprobante ha sido anulado correctamente." });
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Crear {docTypeConfig.label.toLowerCase()}</h1>
            <p className="text-sm text-muted-foreground">Completa la informacion del comprobante comercial.</p>
          </div>
          <Button variant="outline" onClick={() => setShowForm(false)} disabled={isCreatingInvoice}>Volver</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informacion general</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo de comprobante</Label>
              <Select value={selectedDocType} onValueChange={(value) => setSelectedDocType(value as DocumentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            </div>
          </CardContent>
        </Card>

        {needsProducts && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label>Producto</Label>
                  <Input
                    list="invoice-products"
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    placeholder="Escribe o selecciona un producto"
                    disabled={isCreatingInvoice}
                  />
                  <datalist id="invoice-products">
                    {products.filter((item) => item.active).map((item) => (
                      <option key={item.id} value={item.name} />
                    ))}
                  </datalist>
                </div>
                <div className="flex items-end">
                  <Button onClick={addLine} disabled={isCreatingInvoice} className="gap-2">
                    <Plus className="h-4 w-4" />Agregar
                  </Button>
                </div>
              </div>

              {lines.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Agrega productos al comprobante.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto y descripcion</TableHead>
                      <TableHead className="w-24">Cantidad</TableHead>
                      <TableHead className="w-28">Precio</TableHead>
                      <TableHead className="w-20">IVA %</TableHead>
                      <TableHead className="w-24 text-center">Stock</TableHead>
                      <TableHead className="w-28 text-right">Subtotal</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, index) => {
                      const product = products.find((item) => item.id === line.productId);
                      const isStocked = product?.type === "Bien";
                      const stock = product?.stock ?? 0;
                      const exceedsStock = isStocked && line.quantity > stock;

                      return (
                        <TableRow key={`${line.productId}-${index}`}>
                          <TableCell className="min-w-[360px]">
                            <Textarea
                              value={line.name}
                              placeholder="Descripcion para el comprobante"
                              onChange={(event) => updateLine(index, "name", event.target.value)}
                              rows={3}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              value={line.quantity}
                              onChange={(event) => updateLine(index, "quantity", Number(event.target.value))}
                              className={exceedsStock ? "border-destructive" : ""}
                            />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" value={line.price} onChange={(event) => updateLine(index, "price", Number(event.target.value))} />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              value={line.iva}
                              onChange={(event) => updateLine(index, "iva", event.target.value)}
                              className="text-center"
                              disabled={isCreatingInvoice}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            {isStocked ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className={`text-sm font-medium ${exceedsStock ? "text-destructive" : ""}`}>{stock}</span>
                                {exceedsStock && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Sin limite</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">${(line.quantity * line.price).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => removeLine(index)} disabled={isCreatingInvoice}>Quitar</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              <div className="mt-4 flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">IVA</span><span>${ivaTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between border-t pt-1 text-base font-bold"><span>Total</span><span>${total.toFixed(2)}</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button onClick={emitInvoice} disabled={createInvoice.isPending || isCreatingInvoice} className="gap-2">
            {(createInvoice.isPending || isCreatingInvoice) && <Loader2 className="h-4 w-4 animate-spin" />}
            {createInvoice.isPending || isCreatingInvoice ? "Cargando..." : `Crear ${docTypeConfig.label.toLowerCase()}`}
          </Button>
        </div>
      </div>
    );
  }

  const uniqueClients = [...new Set(invoices.map((invoice) => invoice.client_name))];
  const filteredInvoices = invoices.filter((invoice) => {
    if (searchNumber && !invoice.number.toLowerCase().includes(searchNumber.toLowerCase())) return false;
    if (filterClient !== "all" && invoice.client_name !== filterClient) return false;
    if (filterDocType !== "all" && invoice.document_type !== filterDocType) return false;
    if (filterDateFrom && invoice.date < filterDateFrom) return false;
    if (filterDateTo && invoice.date > filterDateTo) return false;
    return true;
  });

  const exportData = filteredInvoices.map((invoice) => ({
    date: invoice.date,
    client: invoice.client_name,
    number: invoice.number,
    type: DOCUMENT_TYPES[invoice.document_type as DocumentType]?.label || "Factura",
    subtotal: Number(invoice.subtotal),
    iva: Number(invoice.iva),
    total: Number(invoice.total),
    status: getInvoiceStatusMeta(invoice.status).label,
    delivery: getInvoiceDeliveryStatusMeta(invoice.delivery_status).label,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facturacion</h1>
          <p className="text-sm text-muted-foreground">Gestiona tus comprobantes comerciales con estados claros y envio de PDF.</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu
            onCSV={() => exportInvoicesToCSV(exportData)}
            onExcel={() => exportInvoicesToExcel(exportData)}
            onPDF={() => exportInvoicesToPDF(exportData)}
            disabled={filteredInvoices.length === 0}
          />
          <Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Nuevo comprobante</Button>
        </div>
      </div>

      <Tabs value={filterDocType} onValueChange={setFilterDocType}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="all" className="gap-1.5">
            <FileText className="h-4 w-4" />Todos
          </TabsTrigger>
          {Object.entries(DOCUMENT_TYPES).map(([key, value]) => {
            const Icon = docTypeIcons[key as DocumentType];
            const count = invoices.filter((invoice) => invoice.document_type === key).length;
            return (
              <TabsTrigger key={key} value={key} className="gap-1.5">
                <Icon className="h-4 w-4" />{value.label}
                {count > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{count}</Badge>}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Buscar por numero</Label>
              <Input placeholder="FAC-001-..." value={searchNumber} onChange={(event) => setSearchNumber(event.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueClients.map((clientName) => (
                    <SelectItem key={clientName} value={clientName}>{clientName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Desde</Label>
              <Input type="date" value={filterDateFrom} onChange={(event) => setFilterDateFrom(event.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Hasta</Label>
              <Input type="date" value={filterDateTo} onChange={(event) => setFilterDateTo(event.target.value)} className="h-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Numero</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No se encontraron comprobantes.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice: Invoice) => {
                    const documentType = (invoice.document_type || "factura") as DocumentType;
                    const documentConfig = DOCUMENT_TYPES[documentType];
                    const DocumentIcon = docTypeIcons[documentType];
                    const deliveryStatus = getInvoiceDeliveryStatusMeta(invoice.delivery_status);

                    return (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <DocumentIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium">{documentConfig?.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{invoice.date}</TableCell>
                        <TableCell className="text-sm font-medium">{invoice.client_name}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{invoice.number}</TableCell>
                        <TableCell className="text-right text-sm font-medium">${Number(invoice.total).toFixed(2)}</TableCell>
                        <TableCell><InvoiceStatusBadge status={invoice.status} /></TableCell>
                        <TableCell><Badge className={deliveryStatus.className}>{deliveryStatus.label}</Badge></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/app/facturacion/${invoice.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />Ver detalle
                              </DropdownMenuItem>
                              {documentType === "factura" && (
                                <DropdownMenuItem
                                  onClick={() => markAsPaid(invoice.id)}
                                  disabled={invoice.status === "pagada" || invoice.status === "anulada"}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />Marcar como pagada
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => annulInvoice(invoice.id)}
                                disabled={invoice.status === "anulada"}
                                className="text-destructive"
                              >
                                <XCircle className="mr-2 h-4 w-4" />Anular
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

