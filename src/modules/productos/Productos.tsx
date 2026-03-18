import { useState } from "react";
import { Plus, AlertTriangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FieldError } from "@/components/ui/field-error";
import { useProducts, useCreateProduct } from "@/services/products";
import { useToast } from "@/hooks/use-toast";
import { productSchema, validateForm, type FieldErrors } from "@/lib/validations";

export default function Productos() {
  const [showForm, setShowForm] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [form, setForm] = useState({ name: "", price: "", iva: "15", type: "Bien", stock: "0", min_stock: "0" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const { toast } = useToast();
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();

  const lowStockProducts = products.filter(
    (p) => p.type === "Bien" && p.active && p.stock <= p.min_stock && p.min_stock > 0
  );

  const updateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const handleSave = async () => {
    setErrors({});
    const parsed = {
      name: form.name,
      price: parseFloat(form.price) || 0,
      iva: parseFloat(form.iva) || 15,
      type: form.type,
      stock: parseInt(form.stock) || 0,
      min_stock: parseInt(form.min_stock) || 0,
    };
    const validation = validateForm(productSchema, parsed);
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }
    const validData = validation.data;
    try {
      await createProduct.mutateAsync(validData as any);
      toast({ title: "Producto creado", description: `${form.name} ha sido registrado.` });
      setForm({ name: "", price: "", iva: "15", type: "Bien", stock: "0", min_stock: "0" });
      setErrors({});
      setShowForm(false);
    } catch (e: any) {
      toast({ title: "Error al crear producto", description: e.message || "Ocurrió un error inesperado. Intenta de nuevo.", variant: "destructive" });
    }
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Nuevo producto</h1>
            <p className="text-muted-foreground text-sm">Registra un producto o servicio</p>
          </div>
          <Button variant="outline" onClick={() => { setShowForm(false); setErrors({}); }}>Volver</Button>
        </div>
        <Card>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input placeholder="Nombre del producto" value={form.name} onChange={updateField("name")} className={errors.name ? "border-destructive" : ""} />
              <FieldError error={errors.name} />
            </div>
            <div className="space-y-2">
              <Label>Precio <span className="text-destructive">*</span></Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.price} onChange={updateField("price")} className={errors.price ? "border-destructive" : ""} />
              <FieldError error={errors.price} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bien">Bien</SelectItem>
                  <SelectItem value="Servicio">Servicio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>IVA (%)</Label>
              <Select value={form.iva} onValueChange={v => setForm(f => ({ ...f, iva: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15%</SelectItem>
                  <SelectItem value="0">0%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stock inicial</Label>
              <Input type="number" min={0} value={form.stock} onChange={updateField("stock")} className={errors.stock ? "border-destructive" : ""} />
              <FieldError error={errors.stock} />
            </div>
            <div className="space-y-2">
              <Label>Stock mínimo</Label>
              <Input type="number" min={0} value={form.min_stock} onChange={updateField("min_stock")} className={errors.min_stock ? "border-destructive" : ""} />
              <FieldError error={errors.min_stock} />
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={createProduct.isPending}>
            {createProduct.isPending ? "Guardando..." : "Guardar producto"}
          </Button>
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter(p => {
    if (searchName && !p.name.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (filterType !== "all" && p.type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-muted-foreground text-sm">Catálogo de productos y servicios</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />Nuevo producto</Button>
      </div>

      {lowStockProducts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Inventario bajo</AlertTitle>
          <AlertDescription>
            {lowStockProducts.length === 1
              ? `${lowStockProducts[0].name} tiene stock por debajo del mínimo (${lowStockProducts[0].stock}/${lowStockProducts[0].min_stock}).`
              : `${lowStockProducts.length} productos tienen stock por debajo del mínimo.`
            }
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-4 pb-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input placeholder="Buscar por nombre..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className="max-w-sm" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="Bien">Bien</SelectItem>
                <SelectItem value="Servicio">Servicio</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>IVA</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-center">Mín.</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No se encontraron productos.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((p) => {
                    const isLowStock = p.type === "Bien" && p.min_stock > 0 && p.stock <= p.min_stock;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {p.name}
                            {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            <Package className="h-3 w-3 mr-1" />{p.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-right">${Number(p.price).toFixed(2)}</TableCell>
                        <TableCell className="text-sm">{Number(p.iva)}%</TableCell>
                        <TableCell className="text-center">
                          {p.type === "Bien" ? (
                            <span className={`text-sm font-medium ${isLowStock ? "text-destructive" : ""}`}>{p.stock}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {p.type === "Bien" && p.min_stock > 0 ? (
                            <span className="text-sm text-muted-foreground">{p.min_stock}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.active ? "default" : "secondary"}>
                            {p.active ? "Activo" : "Inactivo"}
                          </Badge>
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
