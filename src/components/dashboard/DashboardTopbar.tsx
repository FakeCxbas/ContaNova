import { AlertTriangle, Bell, Check, Clock, DollarSign, FileText, LogOut, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BrandMark } from "@/components/branding/BrandMark";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationSync } from "@/hooks/useNotificationSync";
import { useCompany } from "@/services/companies";
import { useNotifications, type Notification } from "@/stores/notificationStore";
import { SidebarTrigger } from "@/components/ui/sidebar";

const typeConfig: Record<Notification["type"], { icon: typeof Bell; className: string }> = {
  factura: { icon: FileText, className: "text-blue-500 bg-blue-500/10" },
  pago: { icon: DollarSign, className: "text-green-500 bg-green-500/10" },
  inventario: { icon: AlertTriangle, className: "text-amber-500 bg-amber-500/10" },
  pendiente: { icon: Clock, className: "text-orange-500 bg-orange-500/10" },
};

const roleLabels: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  contador: "Contador",
  empleado: "Operador",
};

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Ahora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

export function DashboardTopbar() {
  const navigate = useNavigate();
  useNotificationSync();
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const { user, role, signOut } = useAuth();
  const { data: company } = useCompany();
  const unread = unreadCount();

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario";
  const initials = displayName.split(" ").map((part: string) => part[0]).join("").toUpperCase().slice(0, 2);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/80 backdrop-blur-md px-3 md:px-6 transition-all">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
        
        {/* Buscador rapido estilo Linear */}
        <button
          type="button"
          onClick={() => navigate("/app/facturacion")}
          className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-border/70 bg-muted/40 text-xs text-muted-foreground hover:border-primary/40 hover:bg-muted/70 transition-all cursor-pointer"
        >
          <Search size={13} className="text-muted-foreground" />
          <span className="hidden md:inline">Buscar facturas o clientes...</span>
          <span className="md:hidden">Buscar...</span>
          <kbd className="ml-1 hidden rounded border border-border/80 bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline-block shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        {/* Badge de estado en vivo de la empresa */}
        {role !== "superadmin" && company && (
          <div className="hidden lg:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-foreground truncate max-w-[140px]">{company.name}</span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">SRI Activo</span>
          </div>
        )}

        <ThemeToggle />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute 1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground shadow-sm animate-pulse">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] p-0 sm:w-84 rounded-2xl border-border/70 shadow-xl backdrop-blur-xl" align="end">
            <div className="flex items-center justify-between p-3.5 pb-2.5">
              <h4 className="text-sm font-bold">Notificaciones</h4>
              {unread > 0 && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary font-semibold" onClick={markAllAsRead}>
                  <Check className="mr-1 h-3 w-3" />Marcar todas
                </Button>
              )}
            </div>
            <Separator className="bg-border/60" />
            <ScrollArea className="h-[320px]">
              {notifications.length === 0 ? (
                <p className="py-10 text-center text-xs text-muted-foreground">Sin notificaciones pendientes</p>
              ) : (
                notifications.map((notification) => {
                  const config = typeConfig[notification.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={notification.id}
                      className={`flex cursor-pointer gap-3 p-3 transition-colors hover:bg-muted/60 border-b border-border/30 last:border-0 ${!notification.read ? "bg-primary/5" : ""}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5 ${config.className}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs leading-tight ${!notification.read ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                            {notification.title}
                          </p>
                          {!notification.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{notification.message}</p>
                        <p className="mt-1 text-[10px] font-medium text-muted-foreground/70">{timeAgo(notification.timestamp)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Separador vertical sutil */}
        <div className="h-4 w-px bg-border/60 hidden sm:block" />

        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 ring-2 ring-primary/20 transition-transform hover:scale-105">
            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex md:flex-col text-left">
            <span className="text-xs font-semibold leading-tight text-foreground truncate max-w-[120px]">{displayName}</span>
            {role && <span className="text-[10px] font-medium text-muted-foreground">{roleLabels[role] || role}</span>}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
