import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, DollarSign, FileText, Pencil, Save, ShoppingCart, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvoiceStatusBadge } from "@/components/status/InvoiceStatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useClient, useDeleteClient, useUpdateClient } from "@/services/clients";
import { useInvoices } from "@/services/invoices";

export default function ClienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: client, isLoading } = useClient(id);
  const { data: allInvoices = [] } = useInvoices();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [editing, setEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [form, setForm] = useState({ name: "", identification: "", email: "", phone: "", address: "" });

  const startEdit = () => {
    if (client) {
      setForm({
        name: client.name,
        identification: client.identification,
        email: client.email,
        phone: client.phone,
        address: client.address,
      });
    }
    setEditing(true);
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" /></div>;
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Cliente no encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/app/clientes")}>Volver</Button>
      </div>
    );
  }

  const clientInvoices = allInvoices.filter((invoice) => invoice.client_id === client.id);
  const totalPurchased = clientInvoices.reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const lastPurchase = clientInvoices.length > 0
    ? [...clientInvoices].sort((a, b) => b.date.localeCompare(a.date))[0].date
    : "Sin compras";

  const handleSave = async () => {
    await updateClient.mutateAsync({ id: client.id, ...form });
    setEditing(false);
    toast({ title: "Cliente actualizado" });
  };

  const handleDelete = async () => {
    await deleteClient.mutateAsync(client.id);
    toast({ title: "Cliente eliminado" });
    navigate("/app/clientes");
  };

  const metrics = [
    { label: "Total comprado", value: `$${totalPurchased.toFixed(2)}`, icon: DollarSign },
    { label: "Facturas", value: String(clientInvoices.length), icon: FileText },
    { label: "Ultima compra", value: lastPurchase, icon: Calendar },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/app/clientes")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />Volver a clientes
        </Button>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)} className="gap-2"><X className="h-4 w-4" />Cancelar</Button>
              <Button onClick={handleSave} disabled={updateClient.isPending} className="gap-2"><Save className="h-4 w-4" />Guardar</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={startEdit} className="gap-2"><Pencil className="h-4 w-4" />Editar</Button>
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="gap-2"><Trash2 className="h-4 w-4" />Eliminar</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Eliminar cliente</DialogTitle></DialogHeader>
                  <p className="text-sm text-muted-foreground">Esta accion eliminara a <strong>{client.name}</strong> de forma permanente.</p>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
                    <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" />
            {editing ? "Editar cliente" : client.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Nombre</Label><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Identificacion</Label><Input value={form.identification} onChange={(event) => setForm((current) => ({ ...current, identification: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Telefono</Label><Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Direccion</Label><Input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Identificacion</p><p className="font-medium">{client.identification}</p></div>
              <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{client.email}</p></div>
              <div><p className="text-xs text-muted-foreground">Telefono</p><p className="font-medium">{client.phone}</p></div>
              <div><p className="text-xs text-muted-foreground">Direccion</p><p className="font-medium">{client.address}</p></div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 text-2xl font-bold">{metric.value}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <metric.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Historial de facturas</CardTitle></CardHeader>
        <CardContent>
          {clientInvoices.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Este cliente no tiene facturas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Numero</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/app/facturacion/${invoice.id}`)}>
                    <TableCell className="text-sm">{invoice.date}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{invoice.number}</TableCell>
                    <TableCell className="text-right text-sm font-medium">${Number(invoice.total).toFixed(2)}</TableCell>
                    <TableCell><InvoiceStatusBadge status={invoice.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
