import { useState } from "react";
import { Plus, Eye, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportClientsToCSV, exportClientsToExcel, exportClientsToPDF } from "@/utils/exportUtils";
import { ExportMenu } from "@/components/ExportMenu";
import { useClients, useCreateClient } from "@/services/clients";
import { useToast } from "@/hooks/use-toast";
import { clientSchema, validateForm, type FieldErrors } from "@/lib/validations";

export default function Clientes() {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", identification: "", email: "", phone: "", address: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();

  const updateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const handleSave = async () => {
    setErrors({});
    const validation = validateForm(clientSchema, form);
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }
    const validData = validation.data;
    try {
      await createClient.mutateAsync(validData as any);
      toast({ title: "Cliente creado", description: `${form.name} ha sido registrado.` });
      setForm({ name: "", identification: "", email: "", phone: "", address: "" });
      setErrors({});
      setShowForm(false);
    } catch (e: any) {
      toast({ title: "Error al crear cliente", description: e.message || "Ocurrió un error inesperado. Intenta de nuevo.", variant: "destructive" });
    }
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Nuevo cliente</h1>
            <p className="text-muted-foreground text-sm">Ingresa los datos del cliente</p>
          </div>
          <Button variant="outline" onClick={() => { setShowForm(false); setErrors({}); }}>Volver</Button>
        </div>
        <Card>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre / Razón social <span className="text-destructive">*</span></Label>
              <Input placeholder="Nombre completo o razón social" value={form.name} onChange={updateField("name")} className={errors.name ? "border-destructive" : ""} />
              <FieldError error={errors.name} />
            </div>
            <div className="space-y-2">
              <Label>Identificación (RUC / Cédula)</Label>
              <Input placeholder="1790123456001" value={form.identification} onChange={updateField("identification")} className={errors.identification ? "border-destructive" : ""} />
              <FieldError error={errors.identification} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="correo@ejemplo.com" value={form.email} onChange={updateField("email")} className={errors.email ? "border-destructive" : ""} />
              <FieldError error={errors.email} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input placeholder="099-1234567" value={form.phone} onChange={updateField("phone")} className={errors.phone ? "border-destructive" : ""} />
              <FieldError error={errors.phone} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Dirección</Label>
              <Input placeholder="Dirección completa" value={form.address} onChange={updateField("address")} className={errors.address ? "border-destructive" : ""} />
              <FieldError error={errors.address} />
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={createClient.isPending}>
            {createClient.isPending ? "Guardando..." : "Guardar cliente"}
          </Button>
        </div>
      </div>
    );
  }

  const filteredClients = clients.filter(c => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.identification.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground text-sm">Directorio de clientes</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu
            onCSV={() => exportClientsToCSV(filteredClients)}
            onExcel={() => exportClientsToExcel(filteredClients)}
            onPDF={() => exportClientsToPDF(filteredClients)}
            disabled={filteredClients.length === 0}
          />
          <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />Nuevo cliente</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 pb-0">
          <Input
            placeholder="Buscar por nombre o identificación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
        <CardContent className="p-0 pt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>RUC / Cédula</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No se encontraron clientes.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/app/clientes/${c.id}`)}>
                      <TableCell className="text-sm font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.identification}</TableCell>
                      <TableCell className="text-sm">{c.email}</TableCell>
                      <TableCell className="text-sm">{c.phone}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/app/clientes/${c.id}`); }}>
                              <Eye className="mr-2 h-4 w-4" />Ver perfil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
