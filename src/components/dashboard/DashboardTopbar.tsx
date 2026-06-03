import { AlertTriangle, Bell, Check, Clock, DollarSign, FileText, LogOut } from "lucide-react";
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
  empleado: "Empleado",
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
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Panel de control</p>
        <p className="text-xs text-muted-foreground">Gestiona tu plataforma y accesos desde un solo lugar.</p>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <ThemeToggle />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between p-3 pb-2">
              <h4 className="text-sm font-semibold">Notificaciones</h4>
              {unread > 0 && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={markAllAsRead}>
                  <Check className="mr-1 h-3 w-3" />Marcar todas
                </Button>
              )}
            </div>
            <Separator />
            <ScrollArea className="h-[320px]">
              {notifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Sin notificaciones</p>
              ) : (
                notifications.map((notification) => {
                  const config = typeConfig[notification.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={notification.id}
                      className={`flex cursor-pointer gap-3 p-3 transition-colors hover:bg-muted/50 ${!notification.read ? "bg-primary/5" : ""}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.className}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-tight ${!notification.read ? "font-semibold" : "font-medium"}`}>
                            {notification.title}
                          </p>
                          {!notification.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(notification.timestamp)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {role !== "superadmin" && (
          <div className="hidden items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1.5 md:flex">
            {company?.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-7 w-7 rounded-full object-cover ring-1 ring-border" />
            ) : (
              <BrandMark compact className="h-7 w-7 rounded-full" />
            )}
            <div className="max-w-[160px]">
              <p className="truncate text-xs font-semibold leading-tight">{company?.name || "ContaNova"}</p>
              <p className="truncate text-[10px] text-muted-foreground">Empresa activa</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex md:flex-col">
            <span className="text-sm font-medium leading-tight">{displayName}</span>
            {role && <span className="text-[10px] text-muted-foreground">{roleLabels[role] || role}</span>}
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={handleLogout} title="Cerrar sesion">
          <LogOut className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
}
