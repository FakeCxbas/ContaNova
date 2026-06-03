import { useMemo, useState } from "react";
import { Plus, AlertTriangle, Package, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { useProducts, useCreateProduct, useUpdateProduct } from "@/services/products";
import { useToast } from "@/hooks/use-toast";
import { productSchema, validateForm, type FieldErrors } from "@/lib/validations";
import type { ProductInput } from "@/services/productService";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Ocurrio un error inesperado. Intenta de nuevo.";

export default function Productos() {
  const [showForm, setShowForm] = useState(false);
  const [restockTargetId, setRestockTargetId] = useState<string | null>(null);
  const [restockAmount, setRestockAmount] = useState("1");
  const [searchName, setSearchName] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [form, setForm] = useState({ name: "", price: "", iva: "15", type: "Bien", stock: "0", min_stock: "0" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const { toast } = useToast();
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const lowStockProducts = products.filter(
    (product) => product.type === "Bien" && product.active && product.stock <= product.min_stock && product.min_stock > 0,
  );

  const restockTarget = useMemo(
    () => products.find((product) => product.id === restockTargetId) ?? null,
    [products, restockTargetId],
  );

  const updateField = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
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
      await createProduct.mutateAsync(validData as ProductInput);
      toast({ title: "Producto creado", description: `${form.name} ha sido registrado.` });
      setForm({ name: "", price: "", iva: "15", type: "Bien", stock: "0", min_stock: "0" });
      setErrors({});
      setShowForm(false);
    } catch (error) {
      toast({ title: "Error al crear producto", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const openRestockDialog = (productId: string) => {
    setRestockTargetId(productId);
    setRestockAmount("1");
  };

  const handleRestock = async () => {
    if (!restockTarget) return;

    const amount = Number.parseInt(restockAmount, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: "Cantidad invalida",
        description: "Ingresa una cantidad mayor a 0 para reestockear.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateProduct.mutateAsync({
        id: restockTarget.id,
        stock: restockTarget.stock + amount,
      });
      toast({
        title: "Stock actualizado",
        description: `${restockTarget.name} ahora tiene ${restockTarget.stock + amount} unidades disponibles.`,
      });
      setRestockTargetId(null);
      setRestockAmount("1");
    } catch (error) {
      toast({
        title: "No se pudo reestockear",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Nuevo producto</h1>
            <p className="text-sm text-muted-foreground">Registra un producto o servicio</p>
          </div>
          <Button variant="outline" onClick={() => { setShowForm(false); setErrors({}); }}>Volver</Button>
        </div>
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
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
              <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bien">Bien</SelectItem>
                  <SelectItem value="Servicio">Servicio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>IVA (%)</Label>
              <Select value={form.iva} onValueChange={(value) => setForm((current) => ({ ...current, iva: value }))}>
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
              <Label>Stock minimo</Label>
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

  const filteredProducts = products.filter((product) => {
    if (searchName && !product.name.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (filterType !== "all" && product.type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-sm text-muted-foreground">Catalogo de productos y servicios</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Nuevo producto</Button>
      </div>

      {lowStockProducts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Inventario bajo</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {lowStockProducts.length === 1
                  ? `${lowStockProducts[0].name} tiene stock por debajo del minimo (${lowStockProducts[0].stock}/${lowStockProducts[0].min_stock}).`
                  : `${lowStockProducts.length} productos tienen stock por debajo del minimo.`}
              </span>
              {lowStockProducts.length === 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 bg-background/70 hover:bg-background"
                  onClick={() => openRestockDialog(lowStockProducts[0].id)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reestockear
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-4 pb-0">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input placeholder="Buscar por nombre..." value={searchName} onChange={(event) => setSearchName(event.target.value)} className="max-w-sm" />
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
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
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
                  <TableHead className="text-center">Min.</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[150px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No se encontraron productos.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const isLowStock = product.type === "Bien" && product.min_stock > 0 && product.stock <= product.min_stock;
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {product.name}
                            {isLowStock && <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            <Package className="mr-1 h-3 w-3" />{product.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">${Number(product.price).toFixed(2)}</TableCell>
                        <TableCell className="text-sm">{Number(product.iva)}%</TableCell>
                        <TableCell className="text-center">
                          {product.type === "Bien" ? (
                            <span className={`text-sm font-medium ${isLowStock ? "text-destructive" : ""}`}>{product.stock}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {product.type === "Bien" && product.min_stock > 0 ? (
                            <span className="text-sm text-muted-foreground">{product.min_stock}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.active ? "default" : "secondary"}>
                            {product.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {product.type === "Bien" ? (
                            <Button
                              variant={isLowStock ? "default" : "outline"}
                              size="sm"
                              className="gap-2"
                              onClick={() => openRestockDialog(product.id)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Reestockear
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
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

      <Dialog
        open={Boolean(restockTarget)}
        onOpenChange={(open) => {
          if (!open && !updateProduct.isPending) {
            setRestockTargetId(null);
            setRestockAmount("1");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reestockear producto</DialogTitle>
          </DialogHeader>
          {restockTarget && (
            <div className="space-y-4 pt-2">
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <p className="text-sm font-semibold">{restockTarget.name}</p>
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <div>
                    <p>Stock actual</p>
                    <p className="mt-1 text-lg font-bold text-foreground">{restockTarget.stock}</p>
                  </div>
                  <div>
                    <p>Stock minimo</p>
                    <p className="mt-1 text-lg font-bold text-foreground">{restockTarget.min_stock}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="restock-amount">Cantidad a sumar</Label>
                <Input
                  id="restock-amount"
                  type="number"
                  min={1}
                  value={restockAmount}
                  onChange={(event) => setRestockAmount(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  El nuevo stock quedaria en <span className="font-semibold text-foreground">{restockTarget.stock + Math.max(0, Number.parseInt(restockAmount || "0", 10) || 0)}</span>.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRestockTargetId(null)} disabled={updateProduct.isPending}>
                  Cancelar
                </Button>
                <Button onClick={handleRestock} disabled={updateProduct.isPending} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {updateProduct.isPending ? "Actualizando..." : "Confirmar reestock"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
