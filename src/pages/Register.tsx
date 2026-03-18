import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { registerSchema, validateForm, type FieldErrors } from "@/lib/validations";

const Register = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "", ruc: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = validateForm(registerSchema, form);
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }
    const validData = validation.data;

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: validData.email,
      password: validData.password,
      options: {
        data: { full_name: validData.name },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);

    if (error) {
      const msg = error.message === "User already registered"
        ? "Este correo ya está registrado. Intenta iniciar sesión."
        : error.message;
      toast({ title: "Error al crear cuenta", description: msg, variant: "destructive" });
      return;
    }

    toast({
      title: "Cuenta creada",
      description: "Revisa tu correo electrónico para confirmar tu cuenta.",
    });
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold tracking-tight text-foreground">
            Conta<span className="text-primary">Nova</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-6 mb-2">Crear cuenta</h1>
          <p className="text-muted-foreground text-sm">
            Comienza a facturar electrónicamente en minutos
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-8 shadow-card space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" placeholder="Juan Pérez" value={form.name} onChange={update("name")} className={errors.name ? "border-destructive" : ""} />
            <FieldError error={errors.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" placeholder="tu@empresa.com" value={form.email} onChange={update("email")} className={errors.email ? "border-destructive" : ""} />
            <FieldError error={errors.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={update("password")} className={errors.password ? "border-destructive" : ""} />
            <FieldError error={errors.password} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ruc">RUC de empresa</Label>
            <Input id="ruc" placeholder="1790000000001" value={form.ruc} onChange={update("ruc")} className={errors.ruc ? "border-destructive" : ""} maxLength={13} />
            <FieldError error={errors.ruc} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creando..." : "Crear cuenta gratis"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
