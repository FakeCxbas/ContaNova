import { useMemo, useState } from "react";
import { MessageCircle, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const whatsappBase = "https://wa.me/593998134331";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const whatsappLink = useMemo(() => {
    const message = [
      "Hola, quiero una cotizacion para ContaNova.",
      form.name ? `Nombre: ${form.name}` : "",
      form.email ? `Correo: ${form.email}` : "",
      form.message ? `Detalle: ${form.message}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return `${whatsappBase}?text=${encodeURIComponent(message)}`;
  }, [form.email, form.message, form.name]);

  const update = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                Cotizacion y contacto comercial
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Cuéntanos cuántas facturas necesitas al mes, si prefieres pago mensual o anual y si quieres un plan a medida.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <form className="rounded-[28px] border border-border bg-card/90 p-8 shadow-card space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" placeholder="Tu nombre" value={form.name} onChange={update("name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electronico</Label>
                  <Input id="email" type="email" placeholder="tu@empresa.com" value={form.email} onChange={update("email")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Necesidad</Label>
                  <Textarea
                    id="message"
                    placeholder="Ej: necesito 120 facturas al mes, 3 usuarios y prefiero cotizacion anual."
                    rows={6}
                    value={form.message}
                    onChange={update("message")}
                  />
                </div>
                <Button asChild className="w-full h-12 text-base font-semibold">
                  <a href={whatsappLink} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Enviar por WhatsApp
                  </a>
                </Button>
              </form>

              <div className="rounded-[28px] border border-primary/20 bg-[linear-gradient(180deg,rgba(37,99,235,0.16),rgba(15,23,42,0.82))] p-8 shadow-[0_18px_60px_rgba(15,23,42,0.26)]">
                <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-primary">
                  Respuesta directa
                </div>
                <h2 className="mt-5 text-3xl font-black tracking-tight text-foreground">Habla con nosotros por WhatsApp</h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Si ya sabes tu volumen estimado de facturas, te orientamos sobre el plan mensual, anual o una propuesta personalizada sin costo.
                </p>

                <div className="mt-8 rounded-2xl border border-white/10 bg-black/10 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                      <PhoneCall className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">WhatsApp comercial</p>
                      <p className="text-lg font-semibold text-foreground">+593 099 813 4331</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-3 text-sm leading-7 text-muted-foreground">
                  <p>Mensual: <span className="font-semibold text-foreground">$1 por factura</span></p>
                  <p>Anual: <span className="font-semibold text-foreground">$0.50 por factura</span></p>
                  <p>Personalizado: <span className="font-semibold text-foreground">cotizacion gratis segun volumen y operacion</span></p>
                </div>

                <div className="mt-8">
                  <Button asChild variant="outline" className="h-12 w-full rounded-2xl text-base font-semibold">
                    <a href={whatsappBase} target="_blank" rel="noreferrer">
                      Abrir chat directo
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Contact;
