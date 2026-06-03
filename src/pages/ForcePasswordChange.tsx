import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { BrandLogo } from "@/components/branding/BrandMark";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo actualizar la contrasena.";

export default function ForcePasswordChange() {
  const { user, refreshAuthState, signOut } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};

    if (password.length < 8) {
      nextErrors.password = "Usa al menos 8 caracteres.";
    }
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Las contrasenas no coinciden.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !user) return;

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          must_change_password: false,
          password_changed_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (profileError) throw profileError;

      await refreshAuthState();
      toast({ title: "Contrasena actualizada", description: "Ya puedes usar ContaNova normalmente." });
    } catch (error) {
      toast({ title: "No se pudo cambiar la contrasena", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandLogo className="justify-center" />
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-8 shadow-card space-y-5">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Cambia tu contrasena</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Estas usando una clave temporal. Para continuar, crea una contrasena propia y segura.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Nueva contrasena</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((prev) => ({ ...prev, password: "" }));
              }}
              className={errors.password ? "border-destructive" : ""}
            />
            <FieldError error={errors.password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar contrasena</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              className={errors.confirmPassword ? "border-destructive" : ""}
            />
            <FieldError error={errors.confirmPassword} />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Guardando..." : "Cambiar contrasena"}
          </Button>

          <Button type="button" variant="ghost" className="w-full" onClick={signOut} disabled={loading}>
            Cerrar sesion
          </Button>
        </form>
      </div>
    </div>
  );
}
