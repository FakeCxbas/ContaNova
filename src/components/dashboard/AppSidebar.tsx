import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  BarChart3,
  Settings,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, hasPermission } from "@/hooks/useAuth";

const menuItems = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard, module: "dashboard" },
  { title: "Facturación", url: "/app/facturacion", icon: FileText, module: "facturacion" },
  { title: "Clientes", url: "/app/clientes", icon: Users, module: "clientes" },
  { title: "Productos", url: "/app/productos", icon: Package, module: "productos" },
  { title: "Reportes", url: "/app/reportes", icon: BarChart3, module: "reportes" },
  { title: "Configuración", url: "/app/configuracion", icon: Settings, module: "configuracion" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { role } = useAuth();

  // Filter configuracion for non-admins but show for everyone (they can see empresa tab)
  const visibleItems = menuItems.filter((item) => {
    if (item.module === "configuracion") return true; // everyone sees config
    return hasPermission(role, item.module);
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">C</span>
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground">
              Conta<span className="text-primary">Nova</span>
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/app"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
