import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, FileText, DollarSign, Calendar, ShoppingCart, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useClient, useUpdateClient, useDeleteClient } from "@/services/clients";
import { useInvoices } from "@/services/invoices";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<string, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-muted text-muted-foreground border-muted" },
  enviada: { label: "Enviada", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  pagada: { label: "Pagada", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
  anulada: { label: "Anulada", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
};

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
    if (client) setForm({ name: client.name, identification: client.identification, email: client.email, phone: client.phone, address: client.address });
    setEditing(true);
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Cliente no encontrado</p>
        <Button variant="outline" onClick={() => navigate("/app/clientes")}>Volver</Button>
      </div>
    );
  }

  const clientInvoices = allInvoices.filter(inv => inv.client_id === client.id);
  const totalPurchased = clientInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const lastPurchase = clientInvoices.length > 0
    ? clientInvoices.sort((a, b) => b.date.localeCompare(a.date))[0].date
    : "—";

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
    { label: "Última compra", value: lastPurchase, icon: Calendar },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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
                  <DialogHeader><DialogTitle>¿Eliminar cliente?</DialogTitle></DialogHeader>
                  <p className="text-sm text-muted-foreground">Esta acción eliminará a <strong>{client.name}</strong> permanentemente.</p>
                  <div className="flex gap-2 justify-end pt-4">
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
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />{editing ? "Editar cliente" : client.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nombre</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Identificación</Label><Input value={form.identification} onChange={e => setForm(f => ({ ...f, identification: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Dirección</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground text-xs">Identificación</p><p className="font-medium">{client.identification}</p></div>
              <div><p className="text-muted-foreground text-xs">Email</p><p className="font-medium">{client.email}</p></div>
              <div><p className="text-muted-foreground text-xs">Teléfono</p><p className="font-medium">{client.phone}</p></div>
              <div><p className="text-muted-foreground text-xs">Dirección</p><p className="font-medium">{client.address}</p></div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{m.label}</p>
                  <p className="text-2xl font-bold mt-1">{m.value}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <m.icon className="h-5 w-5 text-primary" />
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
            <p className="text-muted-foreground text-sm text-center py-6">Este cliente no tiene facturas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientInvoices.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/app/facturacion/${inv.id}`)}>
                    <TableCell className="text-sm">{inv.date}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{inv.number}</TableCell>
                    <TableCell className="text-sm text-right font-medium">${Number(inv.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={statusConfig[inv.status]?.className}>{statusConfig[inv.status]?.label}</Badge>
                    </TableCell>
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
