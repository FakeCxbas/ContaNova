import { Link } from "react-router-dom";
import { LockKeyhole, ShieldCheck, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BrandLogo } from "@/components/branding/BrandMark";

const Register = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-3xl">
        <Card className="overflow-hidden border-border shadow-card">
          <CardContent className="grid gap-0 p-0 md:grid-cols-[1.2fr_0.8fr]">
            <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 px-8 py-10 text-white">
              <Link to="/" className="inline-flex">
                <BrandLogo
                  className="[&_*]:text-white"
                  caption="Acceso administrado internamente"
                />
              </Link>
              <h1 className="mt-8 text-3xl font-bold leading-tight">
                El acceso ya no se crea desde esta pantalla
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-blue-50">
                Para mantener el control de credenciales y la seguridad de cada cuenta,
                los accesos se asignan de forma interna desde el panel administrativo.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Registro publico desactivado</p>
                    <p className="text-sm text-blue-50/90">
                      Solo los administradores autorizados pueden crear usuarios nuevos.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                  <UserCog className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Credenciales asignadas por ti</p>
                    <p className="text-sm text-blue-50/90">
                      Puedes crear clientes, empleados o contadores desde el panel especial de accesos.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-10">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-foreground">Que hacemos ahora?</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Si ya tienes usuario, entra normalmente. Si necesitas una cuenta nueva,
                el administrador debe crearla desde la configuracion interna.
              </p>

              <div className="mt-8 space-y-3">
                <Button asChild className="w-full">
                  <Link to="/login">Ir a iniciar sesion</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/">Volver al inicio</Link>
                </Button>
              </div>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Si eres administrador, crea credenciales desde el panel de usuarios dentro de la app.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
