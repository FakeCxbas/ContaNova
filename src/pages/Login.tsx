import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { BrandLogo } from "@/components/branding/BrandMark";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { loginSchema, validateForm, type FieldErrors } from "@/lib/validations";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo iniciar sesion. Intenta de nuevo.";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleResendConfirmation = async () => {
    if (!email) {
      setErrors((prev) => ({ ...prev, email: "Ingresa tu correo para reenviar la confirmacion" }));
      return;
    }

    try {
      setResending(true);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        toast({ title: "No se pudo reenviar el correo", description: error.message, variant: "destructive" });
        return;
      }

      toast({
        title: "Correo reenviado",
        description: `Enviamos un nuevo correo de confirmacion a ${email}.`,
      });
    } catch (error) {
      toast({ title: "No se pudo reenviar el correo", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setShowResend(false);

    const validation = validateForm(loginSchema, { email, password });
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      });

      if (error) {
        const isUnconfirmed = error.message === "Email not confirmed";
        const message = error.message === "Invalid login credentials"
          ? "Correo o contrasena incorrectos. Verifica tus datos."
          : isUnconfirmed
            ? "Tu correo no ha sido confirmado. Revisa tu bandeja de entrada."
            : error.message;

        setShowResend(isUnconfirmed);
        toast({ title: "Error de autenticacion", description: message, variant: "destructive" });
        return;
      }

      navigate("/app");
    } catch (error) {
      toast({ title: "Error de autenticacion", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex">
            <BrandLogo className="justify-center" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-6 mb-2">Iniciar sesion</h1>
          <p className="text-muted-foreground text-sm">
            Ingresa a tu cuenta para gestionar tu facturacion
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-8 shadow-card space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electronico</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@empresa.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({ ...prev, email: "" }));
              }}
              className={errors.email ? "border-destructive" : ""}
            />
            <FieldError error={errors.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contrasena</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: "" }));
              }}
              className={errors.password ? "border-destructive" : ""}
            />
            <FieldError error={errors.password} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Ingresando..." : "Iniciar sesion"}
          </Button>
          {showResend && (
            <Button type="button" variant="outline" className="w-full" onClick={handleResendConfirmation} disabled={resending}>
              {resending ? "Reenviando..." : "Reenviar correo de confirmacion"}
            </Button>
          )}
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          El acceso se asigna internamente desde el panel administrativo.
        </p>
      </div>
    </div>
  );
};

export default Login;
