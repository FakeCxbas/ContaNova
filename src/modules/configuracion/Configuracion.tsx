import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Trash2, Shield, FileText, Briefcase, Upload, Building2, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany, useUpdateCompany } from "@/services/companies";
import { companyService } from "@/services/companyService";

interface ManagedUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

const roleBadge: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  admin: { label: "Administrador", variant: "default" },
  contador: { label: "Contador", variant: "secondary" },
  empleado: { label: "Empleado", variant: "outline" },
};

const roleIcon: Record<string, React.ReactNode> = {
  admin: <Shield className="h-4 w-4" />,
  contador: <FileText className="h-4 w-4" />,
  empleado: <Briefcase className="h-4 w-4" />,
};

export default function Configuracion() {
  const { role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === "admin";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: company } = useCompany();
  const updateCompany = useUpdateCompany();

  const [companyForm, setCompanyForm] = useState({
    name: "", ruc: "", address: "", phone: "", email: "",
    establecimiento: "001", punto_emision: "001",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: "", email: "", password: "", role: "empleado" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (company) {
      setCompanyForm({
        name: company.name || "",
        ruc: company.ruc || "",
        address: company.address || "",
        phone: company.phone || "",
        email: company.email || "",
        establecimiento: (company as any).establecimiento || "001",
        punto_emision: (company as any).punto_emision || "001",
      });
      setLogoUrl(company.logo_url || null);
    }
  }, [company]);

  const handleSaveCompany = async () => {
    if (!company) return;
    try {
      await updateCompany.mutateAsync({ id: company.id, ...companyForm, logo_url: logoUrl });
      toast({ title: "Configuración tributaria actualizada" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Solo se permiten imágenes.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "El archivo no debe superar 2MB.", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);
    try {
      const url = await companyService.uploadLogo(company.id, file);
      setLogoUrl(url);
      await updateCompany.mutateAsync({ id: company.id, logo_url: url });
      toast({ title: "Logo actualizado" });
    } catch (err: any) {
      toast({ title: "Error al subir logo", description: err.message, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const callManageUsers = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      }
    );
    return res.json();
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    const data = await callManageUsers({ action: "list" });
    setUsers(data.users || []);
    setLoadingUsers(false);
  };

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast({ title: "Error", description: "Completa todos los campos", variant: "destructive" });
      return;
    }
    setCreating(true);
    const data = await callManageUsers({ action: "create", ...newUser });
    setCreating(false);
    if (data.error) {
      toast({ title: "Error", description: data.error, variant: "destructive" });
      return;
    }
    toast({ title: "Usuario creado", description: `${newUser.full_name} ha sido registrado.` });
    setNewUser({ full_name: "", email: "", password: "", role: "empleado" });
    setDialogOpen(false);
    loadUsers();
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    await callManageUsers({ action: "update_role", user_id: userId, role: newRole });
    toast({ title: "Rol actualizado" });
    loadUsers();
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`¿Eliminar al usuario ${name}?`)) return;
    const data = await callManageUsers({ action: "delete", user_id: userId });
    if (data.error) {
      toast({ title: "Error", description: data.error, variant: "destructive" });
      return;
    }
    toast({ title: "Usuario eliminado" });
    loadUsers();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground text-sm">Configuración tributaria y gestión de usuarios</p>
      </div>

      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa">
            <Building2 className="h-4 w-4 mr-1" /> Empresa
          </TabsTrigger>
          {isAdmin && <TabsTrigger value="usuarios">Usuarios</TabsTrigger>}
        </TabsList>

        <TabsContent value="empresa" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logotipo de la empresa</CardTitle>
              <CardDescription>Se mostrará en los comprobantes electrónicos emitidos.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted/30">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo empresa" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    {uploadingLogo ? "Subiendo..." : "Subir logo"}
                  </Button>
                  <p className="text-xs text-muted-foreground">PNG, JPG o SVG. Máximo 2MB.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información tributaria</CardTitle>
              <CardDescription>Datos fiscales requeridos para la emisión de comprobantes electrónicos.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>RUC</Label>
                <Input
                  value={companyForm.ruc}
                  onChange={e => setCompanyForm(f => ({ ...f, ruc: e.target.value }))}
                  placeholder="1234567890001"
                  maxLength={13}
                />
                <p className="text-xs text-muted-foreground">13 dígitos del Registro Único de Contribuyentes</p>
              </div>
              <div className="space-y-2">
                <Label>Razón social</Label>
                <Input
                  value={companyForm.name}
                  onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Mi Empresa S.A."
                />
              </div>
              <div className="space-y-2">
                <Label>Establecimiento</Label>
                <Input
                  value={companyForm.establecimiento}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 3);
                    setCompanyForm(f => ({ ...f, establecimiento: val }));
                  }}
                  placeholder="001"
                  maxLength={3}
                />
                <p className="text-xs text-muted-foreground">Código de 3 dígitos del establecimiento emisor</p>
              </div>
              <div className="space-y-2">
                <Label>Punto de emisión</Label>
                <Input
                  value={companyForm.punto_emision}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 3);
                    setCompanyForm(f => ({ ...f, punto_emision: val }));
                  }}
                  placeholder="001"
                  maxLength={3}
                />
                <p className="text-xs text-muted-foreground">Código de 3 dígitos del punto de emisión</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Dirección del establecimiento</Label>
                <Input
                  value={companyForm.address}
                  onChange={e => setCompanyForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Av. Principal y Calle Secundaria"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={companyForm.phone}
                  onChange={e => setCompanyForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="09XXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={companyForm.email}
                  onChange={e => setCompanyForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="facturacion@empresa.com"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vista previa de numeración</CardTitle>
              <CardDescription>Formato que tendrán los comprobantes emitidos.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "Factura", example: `FAC-${companyForm.establecimiento.padStart(3, "0")}-${companyForm.punto_emision.padStart(3, "0")}-000000001` },
                  { label: "Nota de Crédito", example: `NC-${companyForm.establecimiento.padStart(3, "0")}-${companyForm.punto_emision.padStart(3, "0")}-000000001` },
                  { label: "Retención", example: `RET-${companyForm.establecimiento.padStart(3, "0")}-${companyForm.punto_emision.padStart(3, "0")}-000000001` },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-mono text-sm font-medium">{item.example}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveCompany} disabled={updateCompany.isPending}>
              {updateCompany.isPending ? "Guardando..." : "Guardar configuración"}
            </Button>
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="usuarios" className="space-y-6 mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Gestión de usuarios</CardTitle>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Nuevo usuario</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Crear nuevo usuario</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div className="space-y-2">
                        <Label>Nombre completo</Label>
                        <Input value={newUser.full_name} onChange={(e) => setNewUser(p => ({ ...p, full_name: e.target.value }))} placeholder="Juan Pérez" />
                      </div>
                      <div className="space-y-2">
                        <Label>Correo electrónico</Label>
                        <Input type="email" value={newUser.email} onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="usuario@empresa.com" />
                      </div>
                      <div className="space-y-2">
                        <Label>Contraseña</Label>
                        <Input type="password" value={newUser.password} onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
                      </div>
                      <div className="space-y-2">
                        <Label>Rol</Label>
                        <Select value={newUser.role} onValueChange={(v) => setNewUser(p => ({ ...p, role: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="contador">Contador</SelectItem>
                            <SelectItem value="empleado">Empleado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button className="w-full" onClick={handleCreateUser} disabled={creating}>
                        {creating ? "Creando..." : "Crear usuario"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Correo</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {roleIcon[u.role]}
                              <Select defaultValue={u.role} onValueChange={(v) => handleUpdateRole(u.id, v)}>
                                <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Administrador</SelectItem>
                                  <SelectItem value="contador">Contador</SelectItem>
                                  <SelectItem value="empleado">Empleado</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id, u.full_name)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {users.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No hay usuarios registrados</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}

                <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-2">
                  <h4 className="font-medium text-sm">Permisos por rol</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-start gap-2"><Badge>Administrador</Badge><span className="text-muted-foreground">Acceso total</span></div>
                    <div className="flex items-start gap-2"><Badge variant="secondary">Contador</Badge><span className="text-muted-foreground">Facturación y reportes</span></div>
                    <div className="flex items-start gap-2"><Badge variant="outline">Empleado</Badge><span className="text-muted-foreground">Solo facturación</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
