import { BarChart3, FileText, LayoutDashboard, Package, Settings, Users } from "lucide-react";
import { BrandMark } from "@/components/branding/BrandMark";
import { NavLink } from "@/components/NavLink";
import { useAuth, hasPermission } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useCompany } from "@/services/companies";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard, module: "dashboard" },
  { title: "Facturacion", url: "/app/facturacion", icon: FileText, module: "facturacion" },
  { title: "Clientes", url: "/app/clientes", icon: Users, module: "clientes" },
  { title: "Productos", url: "/app/productos", icon: Package, module: "productos" },
  { title: "Reportes", url: "/app/reportes", icon: BarChart3, module: "reportes" },
  { title: "Configuracion", url: "/app/configuracion", icon: Settings, module: "configuracion" },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const { role } = useAuth();
  const { data: company } = useCompany();

  const visibleItems = menuItems.filter((item) => hasPermission(role, item.module));
  const sidebarTitle = role === "superadmin" ? "ContaNova" : company?.name || "ContaNova";
  const sidebarCaption = role === "superadmin" ? "Panel de plataforma" : "Gestionado con ContaNova";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-1">
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl px-1 py-1 text-left transition-colors hover:bg-sidebar-accent/70",
            collapsed && "justify-center px-0",
          )}
          onClick={toggleSidebar}
        >
          {role !== "superadmin" && company?.logo_url ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-1">
              <img src={company.logo_url} alt={company.name} className="h-full w-full rounded-xl object-contain" />
            </div>
          ) : (
            <BrandMark compact className="shrink-0" />
          )}
          {!collapsed && (
            <div className="min-w-0">
              <span className="block truncate text-base font-bold text-sidebar-foreground">{sidebarTitle}</span>
              <span className="block text-xs text-sidebar-foreground/70">{sidebarCaption}</span>
            </div>
          )}
        </button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/app"}
                      className={cn("hover:bg-sidebar-accent", collapsed && "justify-center px-0")}
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className={cn("h-4 w-4", !collapsed && "mr-2")} />
                      {!collapsed && <span>{role === "superadmin" && item.module === "configuracion" ? "Empresas" : item.title}</span>}
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
