import { Bell, LogOut, FileText, DollarSign, AlertTriangle, Clock, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNotifications, type Notification } from "@/stores/notificationStore";
import { useAuth } from "@/hooks/useAuth";

const typeConfig: Record<Notification["type"], { icon: typeof Bell; className: string }> = {
  factura: { icon: FileText, className: "text-blue-500 bg-blue-500/10" },
  pago: { icon: DollarSign, className: "text-green-500 bg-green-500/10" },
  inventario: { icon: AlertTriangle, className: "text-amber-500 bg-amber-500/10" },
  pendiente: { icon: Clock, className: "text-orange-500 bg-orange-500/10" },
};

const roleLabels: Record<string, string> = {
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
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const { user, role, signOut } = useAuth();
  const unread = unreadCount();

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
      </div>
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between p-3 pb-2">
              <h4 className="text-sm font-semibold">Notificaciones</h4>
              {unread > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={markAllAsRead}>
                  <Check className="h-3 w-3 mr-1" />Marcar todas
                </Button>
              )}
            </div>
            <Separator />
            <ScrollArea className="h-[320px]">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin notificaciones</p>
              ) : (
                notifications.map((n) => {
                  const config = typeConfig[n.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={n.id}
                      className={`flex gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                      onClick={() => markAsRead(n.id)}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${config.className}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-tight ${!n.read ? "font-semibold" : "font-medium"}`}>
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.timestamp)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col">
            <span className="text-sm font-medium leading-tight">{displayName}</span>
            {role && (
              <span className="text-[10px] text-muted-foreground">{roleLabels[role] || role}</span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
}