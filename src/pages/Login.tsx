import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { BrandLogo } from "@/components/branding/BrandMark";
import { isSupabaseConfigured, supabase, supabaseConfigError } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { loginSchema, validateForm, type FieldErrors } from "@/lib/validations";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, refreshAuthState } = useAuth();

  // Si el usuario ya cuenta con una sesion activa, redirigir directo al dashboard
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/app", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleResendConfirmation = async () => {
    if (!isSupabaseConfigured) {
      toast({ title: "Supabase no configurado", description: supabaseConfigError, variant: "destructive" });
      return;
    }

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
        toast({
          title: "No se pudo reenviar el correo",
          description: getAuthErrorMessage(error, "No se pudo reenviar el correo."),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Correo reenviado",
        description: `Enviamos un nuevo correo de confirmacion a ${email}.`,
      });
    } catch (error) {
      toast({
        title: "No se pudo reenviar el correo",
        description: getAuthErrorMessage(error, "No se pudo reenviar el correo."),
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError("");
    setShowResend(false);

    if (!isSupabaseConfigured) {
      toast({ title: "Supabase no configurado", description: supabaseConfigError, variant: "destructive" });
      return;
    }

    const validation = validateForm(loginSchema, { email, password });
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      });

      if (error) {
        const isUnconfirmed = error.message === "Email not confirmed";
        const message = getAuthErrorMessage(error, "No se pudo iniciar sesion. Intenta de nuevo.");

        setShowResend(isUnconfirmed);
        setFormError(message);
        toast({ title: "Error de autenticacion", description: message, variant: "destructive" });
        return;
      }

      if (!data.session) {
        const message = "Supabase no devolvio una sesion valida. Intenta iniciar sesion otra vez.";
        setFormError(message);
        toast({ title: "Error de autenticacion", description: message, variant: "destructive" });
        return;
      }

      // Sincronizar el contexto de autenticacion para asegurar rol y usuario antes de navegar a la app protegida
      await refreshAuthState();
      navigate("/app", { replace: true });
    } catch (error) {
      const message = getAuthErrorMessage(error, "No se pudo iniciar sesion. Intenta de nuevo.");
      setFormError(message);
      toast({
        title: "Error de autenticacion",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center px-4 overflow-hidden">
      {/* Glow decorativo de fondo */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex transition-transform hover:scale-105 duration-200">
            <BrandLogo className="justify-center" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-6 mb-2">Iniciar sesion</h1>
          <p className="text-muted-foreground text-sm">
            Ingresa a tu cuenta para gestionar tu facturacion
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card/90 backdrop-blur-xl border border-border/80 rounded-2xl p-8 shadow-2xl shadow-blue-500/5 space-y-5">
          {!isSupabaseConfigured && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {supabaseConfigError}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Correo electronico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
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
              name="password"
              type="password"
              autoComplete="current-password"
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
          <Button type="submit" className="w-full" disabled={loading || !isSupabaseConfigured}>
            {loading ? "Ingresando..." : "Iniciar sesion"}
          </Button>
          {formError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {formError}
            </div>
          )}
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
