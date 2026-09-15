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
  { title: "Facturación", url: "/app/facturacion", icon: FileText, module: "facturacion" },
  { title: "Clientes", url: "/app/clientes", icon: Users, module: "clientes" },
  { title: "Productos", url: "/app/productos", icon: Package, module: "productos" },
  { title: "Reportes", url: "/app/reportes", icon: BarChart3, module: "reportes" },
  { title: "Configuración", url: "/app/configuracion", icon: Settings, module: "configuracion" },
];

export function AppSidebar() {
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { role } = useAuth();
  const { data: company } = useCompany();

  const visibleItems = menuItems.filter((item) => hasPermission(role, item.module));
  const sidebarTitle = role === "superadmin" ? "ContaNova" : company?.name || "ContaNova";
  const sidebarCaption = role === "superadmin" ? "Panel de plataforma" : "Gestionado con ContaNova";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/60">
      <SidebarHeader className="border-b border-sidebar-border/60 p-3.5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-1">
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl p-1.5 text-left transition-colors hover:bg-sidebar-accent/70",
            collapsed && "justify-center p-1",
          )}
          onClick={toggleSidebar}
        >
          {role !== "superadmin" && company?.logo_url ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-sidebar-border/80 bg-sidebar-accent/60 p-1 shadow-xs">
              <img src={company.logo_url} alt={company.name} className="h-full w-full rounded-lg object-contain" />
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <BrandMark compact className="shrink-0" />
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <span className="block truncate text-sm font-bold text-sidebar-foreground">{sidebarTitle}</span>
              <span className="block text-[11px] text-muted-foreground">{sidebarCaption}</span>
            </div>
          )}
        </button>
      </SidebarHeader>
      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/70 px-2 mb-1">
            Menú principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-9 rounded-xl transition-all">
                    <NavLink
                      to={item.url}
                      end={item.url === "/app"}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 rounded-xl transition-all",
                        collapsed && "justify-center px-0",
                      )}
                      activeClassName="bg-primary/10 text-primary font-semibold shadow-xs"
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105")} />
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
