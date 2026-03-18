import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { loginSchema, validateForm, type FieldErrors } from "@/lib/validations";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = validateForm(loginSchema, { email, password });
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }
    const validData = validation.data;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: validData.email, password: validData.password });
    setLoading(false);

    if (error) {
      const msg = error.message === "Invalid login credentials"
        ? "Correo o contraseña incorrectos. Verifica tus datos."
        : error.message === "Email not confirmed"
        ? "Tu correo no ha sido confirmado. Revisa tu bandeja de entrada."
        : error.message;
      toast({ title: "Error de autenticación", description: msg, variant: "destructive" });
      return;
    }
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold tracking-tight text-foreground">
            Conta<span className="text-primary">Nova</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-6 mb-2">Iniciar sesión</h1>
          <p className="text-muted-foreground text-sm">
            Ingresa a tu cuenta para gestionar tu facturación
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-8 shadow-card space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" placeholder="tu@empresa.com" value={email} onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: "" })); }} className={errors.email ? "border-destructive" : ""} />
            <FieldError error={errors.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: "" })); }} className={errors.password ? "border-destructive" : ""} />
            <FieldError error={errors.password} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Crear cuenta gratis
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
