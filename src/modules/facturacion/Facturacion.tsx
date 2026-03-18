import { useState } from "react";
import { Plus, Eye, Pencil, CheckCircle, XCircle, MoreHorizontal, AlertTriangle, FileText, FileDown, FileUp, Shield, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { exportInvoicesToCSV, exportInvoicesToExcel, exportInvoicesToPDF } from "@/utils/exportUtils";
import { ExportMenu } from "@/components/ExportMenu";
import { useNotifications } from "@/stores/notificationStore";
import { useClients } from "@/services/clients";
import { useProducts, useUpdateProduct } from "@/services/products";
import { useInvoices, useCreateInvoice, useUpdateInvoice } from "@/services/invoices";
import { useCompanyId } from "@/services/companies";
import { invoiceService, DOCUMENT_TYPES, type DocumentType } from "@/services/invoiceService";

const statusConfig: Record<string, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-muted text-muted-foreground border-muted" },
  enviada: { label: "Enviada", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  pagada: { label: "Pagada", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
  anulada: { label: "Anulada", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
};

const docTypeIcons: Record<DocumentType, typeof FileText> = {
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
  const [showForm, setShowForm] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>("factura");
  const [searchNumber, setSearchNumber] = useState("");
  const [filterClient, setFilterClient] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDocType, setFilterDocType] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: clients = [] } = useClients();
  const { data: products = [] } = useProducts();
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: companyId } = useCompanyId();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const updateProduct = useUpdateProduct();

  const addLine = () => {
    setLines([...lines, { productId: "", name: "", quantity: 1, price: 0, iva: 15 }]);
  };

  const updateLine = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lines];
    (updated[index] as any)[field] = value;
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[index].name = product.name;
        updated[index].price = Number(product.price);
        updated[index].iva = Number(product.iva);
      }
    }
    setLines(updated);
  };

  const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.price, 0);
  const ivaTotal = lines.reduce((sum, l) => sum + l.quantity * l.price * (l.iva / 100), 0);
  const total = subtotal + ivaTotal;

  const docTypeConfig = DOCUMENT_TYPES[selectedDocType];
  const needsProducts = selectedDocType !== "retencion" && selectedDocType !== "guia_remision";

  const emitInvoice = async () => {
    if (needsProducts && lines.length === 0) {
      toast({ title: "Error", description: "Agrega al menos un producto.", variant: "destructive" });
      return;
    }

    if (needsProducts) {
      const stockIssues = lines.filter(l => {
        const p = products.find(pr => pr.id === l.productId);
        return p && p.type === "Bien" && l.quantity > p.stock;
      });

      if (stockIssues.length > 0) {
        toast({ title: "Stock insuficiente", description: `${stockIssues.map(l => l.name).join(", ")} no tiene stock suficiente.`, variant: "destructive" });
        return;
      }
    }

    const client = clients.find(c => c.id === selectedClientId);
    
    if (!companyId) {
      toast({ title: "Error", description: "No se pudo obtener la empresa.", variant: "destructive" });
      return;
    }

    // Get next sequential number from database
    const invNumber = await invoiceService.getNextNumber(companyId, selectedDocType);

    try {
      if (needsProducts && selectedDocType === "factura") {
        for (const line of lines) {
          const p = products.find(pr => pr.id === line.productId);
          if (p && p.type === "Bien") {
            await updateProduct.mutateAsync({ id: p.id, stock: p.stock - line.quantity });
            if (p.min_stock > 0 && (p.stock - line.quantity) <= p.min_stock) {
              useNotifications.getState().addNotification({
                type: "inventario",
                title: "Stock bajo",
                message: `${p.name} tiene stock por debajo del mínimo (${p.stock - line.quantity}/${p.min_stock}).`,
              });
            }
          }
        }
      }

      await createInvoice.mutateAsync({
        client_id: selectedClientId || null,
        client_name: client?.name || "Cliente general",
        number: invNumber,
        date: new Date().toISOString().split("T")[0],
        subtotal,
        iva: ivaTotal,
        total,
        status: "enviada",
        document_type: selectedDocType,
        items: lines.map(l => ({
          product_id: l.productId || null,
          product_name: l.name,
          quantity: l.quantity,
          price: l.price,
          iva: l.iva,
        })),
      });

      setLines([]);
      setSelectedClientId("");
      setSelectedDocType("factura");
      setShowForm(false);
      toast({ title: `${docTypeConfig.label} emitida`, description: `${docTypeConfig.label} ${invNumber} creada exitosamente.` });
      useNotifications.getState().addNotification({
        type: "factura",
        title: `${docTypeConfig.label} emitida`,
        message: `${docTypeConfig.label} ${invNumber} emitida por $${total.toFixed(2)}.`,
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const markAsPaid = async (id: string) => {
    await updateInvoice.mutateAsync({ id, status: "pagada" });
    toast({ title: "Comprobante actualizado", description: "Marcado como pagado." });
  };

  const annulInvoice = async (id: string) => {
    await updateInvoice.mutateAsync({ id, status: "anulada" });
    toast({ title: "Comprobante anulado", description: "El comprobante ha sido anulado correctamente." });
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Crear {docTypeConfig.label.toLowerCase()}</h1>
            <p className="text-muted-foreground text-sm">Completa la información del comprobante</p>
          </div>
          <Button variant="outline" onClick={() => setShowForm(false)}>Volver</Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Información general</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de comprobante</Label>
              <Select value={selectedDocType} onValueChange={(v) => setSelectedDocType(v as DocumentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
          </CardContent>
        </Card>

        {needsProducts && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Productos</CardTitle>
              <Button size="sm" onClick={addLine}><Plus className="h-4 w-4 mr-1" />Agregar</Button>
            </CardHeader>
            <CardContent>
              {lines.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Agrega productos al comprobante</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-24">Cantidad</TableHead>
                      <TableHead className="w-28">Precio</TableHead>
                      <TableHead className="w-20">IVA %</TableHead>
                      <TableHead className="text-center w-20">Stock</TableHead>
                      <TableHead className="text-right w-28">Subtotal</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, i) => {
                      const prod = products.find(p => p.id === line.productId);
                      const isBien = prod?.type === "Bien";
                      const stock = prod?.stock ?? 0;
                      const overStock = isBien && line.quantity > stock;
                      return (
                        <TableRow key={i}>
                          <TableCell>
                            <Select value={line.productId} onValueChange={(v) => updateLine(i, "productId", v)}>
                              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                              <SelectContent>
                                {products.filter(p => p.active).map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name} {p.type === "Bien" ? `(${p.stock} uds)` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={1} value={line.quantity} onChange={(e) => updateLine(i, "quantity", Number(e.target.value))} className={overStock ? "border-destructive" : ""} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" value={line.price} onChange={(e) => updateLine(i, "price", Number(e.target.value))} />
                          </TableCell>
                          <TableCell className="text-sm text-center">{line.iva}%</TableCell>
                          <TableCell className="text-center">
                            {isBien ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className={`text-sm font-medium ${overStock ? "text-destructive" : ""}`}>{stock}</span>
                                {overStock && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">∞</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">${(line.quantity * line.price).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => removeLine(i)}>✕</Button>
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
                  <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>${total.toFixed(2)}</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3 justify-end">
          <Button onClick={emitInvoice} disabled={createInvoice.isPending}>
            {createInvoice.isPending ? "Emitiendo..." : `Emitir ${docTypeConfig.label.toLowerCase()}`}
          </Button>
        </div>
      </div>
    );
  }

  const uniqueClients = [...new Set(invoices.map(inv => inv.client_name))];

  const filteredInvoices = invoices.filter(inv => {
    if (searchNumber && !inv.number.toLowerCase().includes(searchNumber.toLowerCase())) return false;
    if (filterClient !== "all" && inv.client_name !== filterClient) return false;
    if (filterStatus !== "all" && inv.status !== filterStatus) return false;
    if (filterDocType !== "all" && (inv as any).document_type !== filterDocType) return false;
    if (filterDateFrom && inv.date < filterDateFrom) return false;
    if (filterDateTo && inv.date > filterDateTo) return false;
    return true;
  });

  const exportData = filteredInvoices.map(inv => ({
    date: inv.date,
    client: inv.client_name,
    number: inv.number,
    type: DOCUMENT_TYPES[(inv as any).document_type as DocumentType]?.label || "Factura",
    subtotal: Number(inv.subtotal),
    iva: Number(inv.iva),
    total: Number(inv.total),
    status: inv.status,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facturación</h1>
          <p className="text-muted-foreground text-sm">Gestiona tus comprobantes electrónicos</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu
            onCSV={() => exportInvoicesToCSV(exportData)}
            onExcel={() => exportInvoicesToExcel(exportData)}
            onPDF={() => exportInvoicesToPDF(exportData)}
            disabled={filteredInvoices.length === 0}
          />
          <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />Nuevo comprobante</Button>
        </div>
      </div>

      {/* Document type tabs */}
      <Tabs value={filterDocType} onValueChange={setFilterDocType}>
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all" className="gap-1.5">
            <FileText className="h-4 w-4" />Todos
          </TabsTrigger>
          {Object.entries(DOCUMENT_TYPES).map(([key, val]) => {
            const Icon = docTypeIcons[key as DocumentType];
            const count = invoices.filter(i => (i as any).document_type === key).length;
            return (
              <TabsTrigger key={key} value={key} className="gap-1.5">
                <Icon className="h-4 w-4" />{val.label}
                {count > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{count}</Badge>}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Buscar por número</Label>
              <Input placeholder="FAC-001-..." value={searchNumber} onChange={(e) => setSearchNumber(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueClients.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Desde</Label>
              <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Hasta</Label>
              <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="h-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No se encontraron comprobantes.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((inv) => {
                    const dt = ((inv as any).document_type || "factura") as DocumentType;
                    const dtConfig = DOCUMENT_TYPES[dt];
                    const Icon = docTypeIcons[dt];
                    return (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium">{dtConfig?.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{inv.date}</TableCell>
                        <TableCell className="text-sm font-medium">{inv.client_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">{inv.number}</TableCell>
                        <TableCell className="text-sm text-right font-medium">${Number(inv.total).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={statusConfig[inv.status]?.className || ""}>
                            {statusConfig[inv.status]?.label || inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/app/facturacion/${inv.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />Ver detalle
                              </DropdownMenuItem>
                              {dt === "factura" && (
                                <>
                                  <DropdownMenuItem onClick={() => markAsPaid(inv.id)} disabled={inv.status === "pagada" || inv.status === "anulada"}>
                                    <CheckCircle className="mr-2 h-4 w-4" />Marcar como pagada
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem onClick={() => annulInvoice(inv.id)} disabled={inv.status === "anulada"} className="text-destructive">
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
