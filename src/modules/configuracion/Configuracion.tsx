import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Clock3,
  Copy,
  Crown,
  Eye,
  FileText,
  Image as ImageIcon,
  KeyRound,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Shield,
  Trash2,
  Upload,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCompany, useUpdateCompany } from "@/services/companies";
import { activityService } from "@/services/activityService";
import { defaultAppearance, useCompanyAppearance, useUpdateCompanyAppearance, type StatusColorKey } from "@/services/companyAppearance";
import { companyService } from "@/services/companyService";
import { whatsappSettingsService } from "@/services/whatsappSettingsService";
import { electronicBillingService } from "@/services/electronicBillingService";
import { sriCertificateService } from "@/services/sriCertificateService";

interface ManagedUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  email_confirmed?: boolean;
  last_sign_in_at?: string | null;
}

interface ManagedCompany {
  id: string;
  name: string;
  ruc: string;
  email: string;
  phone: string;
  address?: string;
  admin_user_id?: string;
  admin_name: string;
  admin_email: string;
  admin_last_sign_in_at?: string | null;
}

type ApiResponse = {
  users?: ManagedUser[];
  companies?: ManagedCompany[];
  credentials?: { email: string; password: string };
  error?: string;
  message?: string;
  msg?: string;
  code?: string;
  details?: string;
};

type LatestCredentials =
  | { mode: "user"; full_name: string; email: string; password: string; role: string }
  | { mode: "company"; company_name: string; full_name: string; email: string; password: string; role: string };

const companyCredentialStorageKey = (companyId: string) => `contanova:superadmin-company-credentials:${companyId}`;
const selectedCompanyCredentialStorageKey = "contanova:superadmin-selected-company-credentials";

const saveCompanyCredentials = (companyId: string, payload: Extract<LatestCredentials, { mode: "company" }>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(companyCredentialStorageKey(companyId), JSON.stringify(payload));
  window.localStorage.setItem(selectedCompanyCredentialStorageKey, companyId);
};

const loadCompanyCredentials = (companyId: string) => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(companyCredentialStorageKey(companyId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LatestCredentials;
    return parsed.mode === "company" ? parsed : null;
  } catch {
    return null;
  }
};

const rememberSelectedCompanyCredentials = (companyId: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(selectedCompanyCredentialStorageKey, companyId);
};

const loadSelectedCompanyCredentialId = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(selectedCompanyCredentialStorageKey);
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Ocurrio un error inesperado.";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const supabaseFunctionKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const getApiErrorMessage = (data: ApiResponse, fallback = "No se pudo completar la operacion.") =>
  data.error || data.message || data.msg || data.details || (data.code ? `Error ${data.code}` : fallback);

const generatePassword = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  return Array.from({ length: 12 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
};

const roleIcon: Record<string, React.ReactNode> = {
  superadmin: <Crown className="h-4 w-4" />,
  admin: <Shield className="h-4 w-4" />,
  contador: <FileText className="h-4 w-4" />,
  empleado: <Briefcase className="h-4 w-4" />,
};

const userStatus = (user: ManagedUser) => {
  if (user.last_sign_in_at) {
    return { label: "Activo", variant: "default" as const, icon: <CheckCircle2 className="h-3.5 w-3.5" /> };
  }
  if (user.email_confirmed) {
    return { label: "Listo para entrar", variant: "secondary" as const, icon: <KeyRound className="h-3.5 w-3.5" /> };
  }
  return { label: "Pendiente", variant: "outline" as const, icon: <Clock3 className="h-3.5 w-3.5" /> };
};

function InfoTile({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/80 p-3 shadow-sm backdrop-blur-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-medium text-foreground ${mono ? "font-mono break-all" : "break-all"}`}>{value}</p>
    </div>
  );
}

export default function Configuracion() {
  const { role } = useAuth();
  const { toast } = useToast();
  const isSuperadmin = role === "superadmin";
  const isCompanyAdmin = role === "admin";
  const canManageBillingPreferences = role === "admin" || role === "contador" || role === "empleado";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const { data: company } = useCompany();
  const updateCompany = useUpdateCompany();
  const { data: appearance } = useCompanyAppearance();
  const updateAppearance = useUpdateCompanyAppearance();

  const [companyForm, setCompanyForm] = useState({
    name: "",
    ruc: "",
    address: "",
    phone: "",
    email: "",
    establecimiento: "001",
    punto_emision: "001",
    auto_send_invoice_email: false,
    auto_send_invoice_sri: false,
    whatsapp_enabled: false,
    auto_send_invoice_whatsapp: false,
    whatsapp_simulation_mode: true,
    whatsapp_phone_number_id: "",
    whatsapp_business_account_id: "",
    whatsapp_template_name: "",
    whatsapp_template_language: "es",
    whatsapp_token_configured: false,
    sri_environment: "pruebas",
    sri_emission_enabled: false,
  });
  const [whatsappAccessToken, setWhatsappAccessToken] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [statusColors, setStatusColors] = useState(defaultAppearance.statusColors);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePassword, setSignaturePassword] = useState("");
  const [savingSignature, setSavingSignature] = useState(false);
  const [replacingSignature, setReplacingSignature] = useState(false);
  const [savingSriSettings, setSavingSriSettings] = useState(false);
  const [autoSaveConfig, setAutoSaveConfig] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("contanova:config-autosave") !== "false";
  });
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedConfigRef = useRef("");
  const companyFormRef = useRef(companyForm);
  const logoUrlRef = useRef<string | null>(null);
  const statusColorsRef = useRef(statusColors);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [companies, setCompanies] = useState<ManagedCompany[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [latestCredentials, setLatestCredentials] = useState<LatestCredentials | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null);

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [editCompanyDialogOpen, setEditCompanyDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: "", email: "", password: generatePassword(), role: "empleado" });
  const [newCompany, setNewCompany] = useState({
    name: "",
    ruc: "",
    email: "",
    phone: "",
    address: "",
    admin_full_name: "",
    admin_email: "",
    admin_password: generatePassword(),
  });
  const [editingCompany, setEditingCompany] = useState<ManagedCompany | null>(null);
  const [editCompanyForm, setEditCompanyForm] = useState({
    name: "",
    ruc: "",
    email: "",
    phone: "",
    address: "",
    admin_full_name: "",
    admin_email: "",
  });

  useEffect(() => {
    companyFormRef.current = companyForm;
  }, [companyForm]);

  useEffect(() => {
    logoUrlRef.current = logoUrl;
  }, [logoUrl]);

  useEffect(() => {
    statusColorsRef.current = statusColors;
  }, [statusColors]);

  useEffect(() => {
    if (!company) return;
    const nextForm = {
      name: company.name || "",
      ruc: company.ruc || "",
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
      establecimiento: company.establecimiento || "001",
      punto_emision: company.punto_emision || "001",
      auto_send_invoice_email: company.auto_send_invoice_email || false,
      auto_send_invoice_sri: Boolean(company.auto_send_invoice_sri),
      whatsapp_enabled: Boolean(company.whatsapp_enabled),
      auto_send_invoice_whatsapp: Boolean(company.auto_send_invoice_whatsapp),
      whatsapp_simulation_mode: company.whatsapp_simulation_mode ?? true,
      whatsapp_phone_number_id: company.whatsapp_phone_number_id || "",
      whatsapp_business_account_id: company.whatsapp_business_account_id || "",
      whatsapp_template_name: company.whatsapp_template_name || "",
      whatsapp_template_language: company.whatsapp_template_language || "es",
      whatsapp_token_configured: Boolean(company.whatsapp_token_configured),
      sri_environment: company.sri_environment || "pruebas",
      sri_emission_enabled: company.sri_emission_enabled || false,
    };
    const nextLogoUrl = company.logo_url || null;
    setCompanyForm(nextForm);
    setLogoUrl(nextLogoUrl);
    lastSavedConfigRef.current = JSON.stringify({ companyForm: nextForm, logoUrl: nextLogoUrl, statusColors: statusColorsRef.current });
  }, [company]);

  useEffect(() => {
    if (!appearance) return;
    setStatusColors(appearance.statusColors);
    lastSavedConfigRef.current = JSON.stringify({ companyForm: companyFormRef.current, logoUrl: logoUrlRef.current, statusColors: appearance.statusColors });
  }, [appearance]);

  const callManageUsers = async (body: Record<string, unknown>) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Tu sesion expiro. Vuelve a iniciar sesion.");
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseFunctionKey,
      },
      body: JSON.stringify(body),
    });

    const rawText = await response.text();
    let data: ApiResponse = {};
    try {
      data = rawText ? (JSON.parse(rawText) as ApiResponse) : {};
    } catch {
      data = { error: rawText };
    }

    if (!response.ok) {
      throw new Error(getApiErrorMessage(data));
    }

    return data;
  };

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await callManageUsers({ action: "list" });
      setUsers(data.users || []);
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setLoadingUsers(false);
    }
  }, [toast]);

  const loadCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    try {
      const data = await callManageUsers({ action: "list_companies" });
      setCompanies(data.companies || []);
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setLoadingCompanies(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isCompanyAdmin) {
      void loadUsers();
    }
  }, [isCompanyAdmin, loadUsers]);

  useEffect(() => {
    if (isSuperadmin) {
      void loadCompanies();
    }
  }, [isSuperadmin, loadCompanies]);

  useEffect(() => {
    if (!isSuperadmin || latestCredentials?.mode === "company" || companies.length === 0) return;

    const selectedCompanyId = loadSelectedCompanyCredentialId();
    const selectedCompany = selectedCompanyId ? companies.find((item) => item.id === selectedCompanyId) : null;
    const orderedCompanies = selectedCompany
      ? [selectedCompany, ...companies.filter((item) => item.id !== selectedCompany.id)]
      : companies;

    for (const companyItem of orderedCompanies) {
      const storedCredentials = loadCompanyCredentials(companyItem.id);
      if (storedCredentials) {
        setLatestCredentials(storedCredentials);
        return;
      }
    }
  }, [isSuperadmin, companies, latestCredentials]);

  const buildCompanyConfigSnapshot = useCallback(() => (
    JSON.stringify({ companyForm, logoUrl, statusColors })
  ), [companyForm, logoUrl, statusColors]);

  const saveCompanySettings = useCallback(async ({ includeWhatsappToken = false, notify = false, logActivity = false } = {}) => {
    if (!company) return;
    await updateCompany.mutateAsync({ id: company.id, ...companyForm, logo_url: logoUrl });
    if (includeWhatsappToken && whatsappAccessToken.trim()) {
        await whatsappSettingsService.saveAccessToken(whatsappAccessToken.trim());
        setWhatsappAccessToken("");
        setCompanyForm((prev) => ({ ...prev, whatsapp_token_configured: true }));
    }
    await updateAppearance.mutateAsync({ statusColors });
    lastSavedConfigRef.current = buildCompanyConfigSnapshot();
    if (logActivity) {
      await activityService.log({
        companyId: company.id,
        action: "actualizar_configuracion",
        entityType: "empresa",
        entityId: company.id,
        description: "Actualizo la configuracion operativa de la empresa.",
      });
    }
    if (notify) {
      toast({ title: "Configuracion tributaria actualizada" });
    }
  }, [buildCompanyConfigSnapshot, company, companyForm, logoUrl, statusColors, toast, updateAppearance, updateCompany, whatsappAccessToken]);

  const handleSaveCompany = async () => {
    try {
      await saveCompanySettings({ includeWhatsappToken: true, notify: true, logActivity: true });
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("contanova:config-autosave", String(autoSaveConfig));
    }
  }, [autoSaveConfig]);

  useEffect(() => {
    if (!company || !autoSaveConfig) return;

    const snapshot = buildCompanyConfigSnapshot();
    if (!lastSavedConfigRef.current || snapshot === lastSavedConfigRef.current) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus("pending");

    autoSaveTimerRef.current = setTimeout(() => {
      setAutoSaveStatus("saving");
      void saveCompanySettings()
        .then(() => {
          lastSavedConfigRef.current = snapshot;
          setAutoSaveStatus("saved");
        })
        .catch((error) => {
          console.warn("No se pudo autoguardar la configuracion", error);
          setAutoSaveStatus("error");
        });
    }, 900);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [autoSaveConfig, buildCompanyConfigSnapshot, company, saveCompanySettings]);

  const handleSaveSriSettings = async (updates: Partial<Pick<typeof companyForm, "sri_environment" | "sri_emission_enabled">>) => {
    if (!company) return;
    const nextForm = { ...companyForm, ...updates };
    setCompanyForm(nextForm);
    setSavingSriSettings(true);
    try {
      await updateCompany.mutateAsync({
        id: company.id,
        sri_environment: nextForm.sri_environment,
        sri_emission_enabled: nextForm.sri_emission_enabled,
      });
      toast({ title: "Estado SRI actualizado" });
    } catch (error) {
      setCompanyForm((prev) => ({
        ...prev,
        sri_environment: company.sri_environment || "pruebas",
        sri_emission_enabled: company.sri_emission_enabled || false,
      }));
      toast({ title: "No se pudo guardar SRI", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSavingSriSettings(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !company) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Solo se permiten imagenes.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "El archivo no debe superar 2MB.", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);
    try {
      const url = await companyService.uploadLogo(company.id, file);
      setLogoUrl(url);
      await updateCompany.mutateAsync({ id: company.id, logo_url: url });
      toast({ title: "Logo actualizado" });
    } catch (error) {
      toast({ title: "Error al subir logo", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSignatureUpload = async () => {
    if (!signatureFile) {
      toast({ title: "Archivo requerido", description: "Selecciona tu firma electronica .p12 o .pfx.", variant: "destructive" });
      return;
    }
    if (!signaturePassword.trim()) {
      toast({ title: "Clave requerida", description: "Ingresa la clave de la firma electronica.", variant: "destructive" });
      return;
    }

    setSavingSignature(true);
    try {
      await sriCertificateService.upload(signatureFile, signaturePassword);
      if (company?.id) {
        await activityService.log({
          companyId: company.id,
          action: "actualizar_firma_sri",
          entityType: "empresa",
          entityId: company.id,
          description: "Actualizo la firma electronica para emision SRI.",
        });
      }
      setSignatureFile(null);
      setSignaturePassword("");
      setReplacingSignature(false);
      if (signatureInputRef.current) signatureInputRef.current.value = "";
      toast({ title: "Firma electronica guardada", description: "La empresa ya puede usar esta firma para emitir al SRI." });
      window.location.reload();
    } catch (error) {
      toast({ title: "No se pudo guardar la firma", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSavingSignature(false);
    }
  };

  const handleSignatureDelete = async () => {
    if (!window.confirm("Eliminar la firma electronica guardada para esta empresa?")) return;

    setSavingSignature(true);
    try {
      await sriCertificateService.remove();
      setSignatureFile(null);
      setSignaturePassword("");
      setReplacingSignature(false);
      if (signatureInputRef.current) signatureInputRef.current.value = "";
      toast({ title: "Firma electronica eliminada" });
      window.location.reload();
    } catch (error) {
      toast({ title: "No se pudo eliminar la firma", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSavingSignature(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.full_name || !newUser.email || !newUser.password) {
      toast({ title: "Error", description: "Completa todos los campos.", variant: "destructive" });
      return;
    }
    if (!isValidEmail(newUser.email)) {
      toast({ title: "Correo invalido", description: "Ingresa un correo real para el acceso.", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const data = await callManageUsers({ action: "create", ...newUser });
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      setLatestCredentials({
        mode: "user",
        full_name: newUser.full_name,
        email: data.credentials?.email || newUser.email,
        password: data.credentials?.password || newUser.password,
        role: newUser.role,
      });
      setNewUser({ full_name: "", email: "", password: generatePassword(), role: "empleado" });
      setUserDialogOpen(false);
      toast({ title: "Acceso creado" });
      await loadUsers();
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompany.name || !newCompany.admin_full_name || !newCompany.admin_email || !newCompany.admin_password) {
      toast({ title: "Error", description: "Completa la empresa y su admin inicial.", variant: "destructive" });
      return;
    }
    if (newCompany.email && !isValidEmail(newCompany.email)) {
      toast({ title: "Correo invalido", description: "El correo de la empresa no tiene un formato valido.", variant: "destructive" });
      return;
    }
    if (!isValidEmail(newCompany.admin_email)) {
      toast({ title: "Correo admin invalido", description: "El administrador inicial debe tener un correo real.", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const data = await callManageUsers({ action: "create_company", ...newCompany });
      const credentialsPayload: Extract<LatestCredentials, { mode: "company" }> = {
        mode: "company",
        company_name: newCompany.name,
        full_name: newCompany.admin_full_name,
        email: data.credentials?.email || newCompany.admin_email,
        password: data.credentials?.password || newCompany.admin_password,
        role: "admin",
      };
      setLatestCredentials(credentialsPayload);
      if (data.company?.id) {
        saveCompanyCredentials(data.company.id, credentialsPayload);
      }
      setNewCompany({
        name: "",
        ruc: "",
        email: "",
        phone: "",
        address: "",
        admin_full_name: "",
        admin_email: "",
        admin_password: generatePassword(),
      });
      setCompanyDialogOpen(false);
      toast({ title: "Empresa creada" });
      await loadCompanies();
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!latestCredentials) return;
    const payload =
      latestCredentials.mode === "company"
        ? [
            `Empresa: ${latestCredentials.company_name}`,
            `Administrador: ${latestCredentials.full_name}`,
            `Correo: ${latestCredentials.email}`,
            `Clave temporal: ${latestCredentials.password}`,
            `Rol: ${latestCredentials.role}`,
          ].join("\n")
        : [
            `Nombre: ${latestCredentials.full_name}`,
            `Correo: ${latestCredentials.email}`,
            `Clave temporal: ${latestCredentials.password}`,
            `Rol: ${latestCredentials.role}`,
          ].join("\n");

    try {
      await navigator.clipboard.writeText(payload);
      toast({ title: "Credenciales copiadas" });
    } catch {
      toast({ title: "No se pudo copiar", description: "Copia manualmente las credenciales.", variant: "destructive" });
    }
  };

  const handleOpenCompanyCredentials = (companyItem: ManagedCompany) => {
    const storedCredentials = loadCompanyCredentials(companyItem.id);
    if (!storedCredentials) {
      toast({
        title: "No hay credenciales guardadas",
        description: "Por seguridad solo se muestran claves generadas desde este panel. Regenera la clave admin para guardarla de nuevo.",
        variant: "destructive",
      });
      return;
    }
    rememberSelectedCompanyCredentials(companyItem.id);
    setLatestCredentials(storedCredentials);
    toast({ title: "Credenciales abiertas", description: `Mostrando acceso de ${companyItem.name}.` });
  };

  const handleStartEditCompany = (companyItem: ManagedCompany) => {
    setEditingCompany(companyItem);
    setEditCompanyForm({
      name: companyItem.name || "",
      ruc: companyItem.ruc || "",
      email: companyItem.email || "",
      phone: companyItem.phone || "",
      address: companyItem.address || "",
      admin_full_name: companyItem.admin_name || "",
      admin_email: companyItem.admin_email || "",
    });
    setEditCompanyDialogOpen(true);
  };

  const handleSaveEditedCompany = async () => {
    if (!editingCompany?.id || !editingCompany.admin_user_id) {
      toast({ title: "Error", description: "No se encontro el admin de esta empresa.", variant: "destructive" });
      return;
    }
    if (!editCompanyForm.name || !editCompanyForm.admin_full_name || !editCompanyForm.admin_email) {
      toast({ title: "Error", description: "Completa la empresa y el admin principal.", variant: "destructive" });
      return;
    }
    if (editCompanyForm.email && !isValidEmail(editCompanyForm.email)) {
      toast({ title: "Correo invalido", description: "El correo de la empresa no tiene un formato valido.", variant: "destructive" });
      return;
    }
    if (!isValidEmail(editCompanyForm.admin_email)) {
      toast({ title: "Correo admin invalido", description: "El administrador principal debe tener un correo real.", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      await callManageUsers({
        action: "update_company",
        company_id: editingCompany.id,
        admin_user_id: editingCompany.admin_user_id,
        ...editCompanyForm,
      });

      const savedCredentials = loadCompanyCredentials(editingCompany.id);
      if (savedCredentials) {
        const updatedCredentials: Extract<LatestCredentials, { mode: "company" }> = {
          ...savedCredentials,
          company_name: editCompanyForm.name,
          full_name: editCompanyForm.admin_full_name,
          email: editCompanyForm.admin_email,
        };
        saveCompanyCredentials(editingCompany.id, updatedCredentials);
        if (latestCredentials?.mode === "company" && latestCredentials.company_name === editingCompany.name) {
          setLatestCredentials(updatedCredentials);
        }
      }

      setEditCompanyDialogOpen(false);
      setEditingCompany(null);
      toast({ title: "Empresa actualizada" });
      await loadCompanies();
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleResetCompanyCredentials = async (companyItem: ManagedCompany) => {
    if (!companyItem.admin_user_id) {
      toast({ title: "Error", description: "No se encontro el admin principal de esta empresa.", variant: "destructive" });
      return;
    }

    const nextPassword = generatePassword();
    setCreating(true);
    try {
      const data = await callManageUsers({
        action: "reset_company_admin_password",
        company_id: companyItem.id,
        admin_user_id: companyItem.admin_user_id,
        admin_email: companyItem.admin_email,
        admin_full_name: companyItem.admin_name,
        password: nextPassword,
      });

      const credentialsPayload: Extract<LatestCredentials, { mode: "company" }> = {
        mode: "company",
        company_name: companyItem.name,
        full_name: companyItem.admin_name,
        email: data.credentials?.email || companyItem.admin_email,
        password: data.credentials?.password || nextPassword,
        role: "admin",
      };

      saveCompanyCredentials(companyItem.id, credentialsPayload);
      setLatestCredentials(credentialsPayload);
      toast({ title: "Nueva clave generada" });
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCompany = async (companyItem: ManagedCompany) => {
    const confirmation = window.prompt(`Para eliminar "${companyItem.name}", escribe exactamente: ${companyItem.name}`);
    if (confirmation === null) return;

    if (confirmation.trim() !== companyItem.name.trim()) {
      toast({
        title: "Eliminacion cancelada",
        description: "El nombre de confirmacion no coincide con la empresa.",
        variant: "destructive",
      });
      return;
    }

    setDeletingCompanyId(companyItem.id);
    try {
      const data = await callManageUsers({
        action: "delete_company",
        company_id: companyItem.id,
        confirm_name: confirmation.trim(),
      });
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }

      window.localStorage.removeItem(companyCredentialStorageKey(companyItem.id));
      if (loadSelectedCompanyCredentialId() === companyItem.id) {
        window.localStorage.removeItem(selectedCompanyCredentialStorageKey);
      }
      if (latestCredentials?.mode === "company" && latestCredentials.company_name === companyItem.name) {
        setLatestCredentials(null);
      }
      toast({ title: "Empresa eliminada", description: `${companyItem.name} fue eliminada junto con sus usuarios.` });
      await loadCompanies();
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setDeletingCompanyId(null);
    }
  };

  const handleUpdateRole = async (userId: string, nextRole: string) => {
    try {
      const data = await callManageUsers({ action: "update_role", user_id: userId, role: nextRole });
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Rol actualizado" });
      await loadUsers();
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string, fullName: string) => {
    if (!window.confirm(`Eliminar al usuario ${fullName}?`)) return;
    try {
      const data = await callManageUsers({ action: "delete", user_id: userId });
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Usuario eliminado" });
      await loadUsers();
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const companyMetrics = useMemo(
    () => ({
      total: companies.length,
      active: companies.filter((item) => item.admin_last_sign_in_at).length,
      pending: companies.filter((item) => !item.admin_last_sign_in_at).length,
    }),
    [companies],
  );
  const companyReadiness = useMemo(() => electronicBillingService.getCompanyReadiness(company), [company]);

  if (isSuperadmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="text-sm text-muted-foreground">Panel maestro para crear empresas clientes y asignar su admin inicial.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Empresas" value={String(companyMetrics.total)} />
          <MetricCard title="Operativas" value={String(companyMetrics.active)} />
          <MetricCard title="Pendientes" value={String(companyMetrics.pending)} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Provision de empresas</CardTitle>
              <CardDescription>Crea empresa, correo admin y clave temporal en un solo flujo.</CardDescription>
            </div>
            <Dialog open={editCompanyDialogOpen} onOpenChange={setEditCompanyDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Editar empresa y admin principal</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Empresa"><Input value={editCompanyForm.name} onChange={(event) => setEditCompanyForm((prev) => ({ ...prev, name: event.target.value }))} /></Field>
                  <Field label="RUC"><Input value={editCompanyForm.ruc} onChange={(event) => setEditCompanyForm((prev) => ({ ...prev, ruc: event.target.value }))} /></Field>
                  <Field label="Email empresa"><Input type="email" value={editCompanyForm.email} onChange={(event) => setEditCompanyForm((prev) => ({ ...prev, email: event.target.value }))} /></Field>
                  <Field label="Telefono"><Input value={editCompanyForm.phone} onChange={(event) => setEditCompanyForm((prev) => ({ ...prev, phone: event.target.value }))} /></Field>
                  <Field label="Direccion" className="md:col-span-2"><Input value={editCompanyForm.address} onChange={(event) => setEditCompanyForm((prev) => ({ ...prev, address: event.target.value }))} /></Field>
                  <Field label="Admin principal"><Input value={editCompanyForm.admin_full_name} onChange={(event) => setEditCompanyForm((prev) => ({ ...prev, admin_full_name: event.target.value }))} /></Field>
                  <Field label="Correo admin"><Input type="email" value={editCompanyForm.admin_email} onChange={(event) => setEditCompanyForm((prev) => ({ ...prev, admin_email: event.target.value }))} /></Field>
                </div>
                <Button onClick={handleSaveEditedCompany} disabled={creating}>{creating ? "Guardando..." : "Guardar cambios"}</Button>
              </DialogContent>
            </Dialog>
            <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Building2 className="mr-2 h-4 w-4" />
                  Nueva empresa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Crear empresa con admin inicial</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Empresa"><Input value={newCompany.name} onChange={(event) => setNewCompany((prev) => ({ ...prev, name: event.target.value }))} /></Field>
                  <Field label="RUC"><Input value={newCompany.ruc} onChange={(event) => setNewCompany((prev) => ({ ...prev, ruc: event.target.value }))} /></Field>
                  <Field label="Email empresa"><Input type="email" value={newCompany.email} onChange={(event) => setNewCompany((prev) => ({ ...prev, email: event.target.value }))} /></Field>
                  <Field label="Telefono"><Input value={newCompany.phone} onChange={(event) => setNewCompany((prev) => ({ ...prev, phone: event.target.value }))} /></Field>
                  <Field label="Direccion" className="md:col-span-2"><Input value={newCompany.address} onChange={(event) => setNewCompany((prev) => ({ ...prev, address: event.target.value }))} /></Field>
                  <Field label="Admin inicial"><Input value={newCompany.admin_full_name} onChange={(event) => setNewCompany((prev) => ({ ...prev, admin_full_name: event.target.value }))} /></Field>
                  <Field label="Correo admin">
                    <div className="space-y-2">
                      <Input type="email" value={newCompany.admin_email} onChange={(event) => setNewCompany((prev) => ({ ...prev, admin_email: event.target.value }))} />
                      <p className="text-xs text-muted-foreground">Usa un correo completo, por ejemplo `admin@empresa.com`.</p>
                    </div>
                  </Field>
                  <Field label="Clave temporal" className="md:col-span-2">
                    <div className="flex gap-2">
                      <Input type="text" value={newCompany.admin_password} onChange={(event) => setNewCompany((prev) => ({ ...prev, admin_password: event.target.value }))} />
                      <Button type="button" variant="outline" onClick={() => setNewCompany((prev) => ({ ...prev, admin_password: generatePassword() }))}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Generar
                      </Button>
                    </div>
                  </Field>
                </div>
                <Button onClick={handleCreateCompany} disabled={creating}>{creating ? "Creando..." : "Crear empresa"}</Button>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Desde aqui creas la empresa compradora y defines el administrador que luego gestionara solo su tenant.
            </div>

            {latestCredentials?.mode === "company" && (
              <CredentialsCard
                title="Credenciales guardadas de empresa"
                description="Puedes volver a abrir esta pantalla desde Mostrar credenciales en el menu de la empresa."
                onCopy={handleCopyCredentials}
              >
                <InfoTile label="Empresa" value={latestCredentials.company_name} />
                <InfoTile label="Administrador" value={latestCredentials.full_name} />
                <InfoTile label="Correo" value={latestCredentials.email} />
                <InfoTile label="Clave temporal" value={latestCredentials.password} mono />
              </CredentialsCard>
            )}

            <div className="mt-6">
              {loadingCompanies ? (
                <Spinner />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Admin principal</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.ruc || "Sin RUC"}</p></div></TableCell>
                        <TableCell><div><p className="font-medium">{item.admin_name || "Sin asignar"}</p><p className="text-xs text-muted-foreground">{item.admin_email || "Sin correo"}</p></div></TableCell>
                        <TableCell><Badge variant={item.admin_last_sign_in_at ? "default" : "secondary"}>{item.admin_last_sign_in_at ? "Operativa" : "Admin pendiente"}</Badge></TableCell>
                        <TableCell><div><p className="text-sm">{item.email || "Sin email"}</p><p className="text-xs text-muted-foreground">{item.phone || "Sin telefono"}</p></div></TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem onClick={() => handleStartEditCompany(item)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar empresa
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenCompanyCredentials(item)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Mostrar credenciales
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResetCompanyCredentials(item)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Regenerar clave admin
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteCompany(item)}
                                disabled={deletingCompanyId === item.id}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deletingCompanyId === item.id ? "Eliminando..." : "Eliminar empresa"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {companies.length === 0 && <EmptyRow colSpan={5} text="Aun no hay empresas registradas." />}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracion</h1>
        <p className="text-sm text-muted-foreground">Configuracion tributaria y control interno de accesos.</p>
      </div>

      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa"><Building2 className="mr-1 h-4 w-4" />Empresa</TabsTrigger>
          {isCompanyAdmin && <TabsTrigger value="usuarios">Accesos</TabsTrigger>}
        </TabsList>

        <TabsContent value="empresa" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado de emision electronica</CardTitle>
              <CardDescription>Valida datos del emisor y define si la conexion con el SRI trabajara en pruebas o produccion.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`rounded-xl border p-4 ${companyReadiness.ok ? "border-emerald-200 bg-emerald-50/70" : "border-orange-200 bg-orange-50/70"}`}>
                <p className={`font-medium ${companyReadiness.ok ? "text-emerald-900" : "text-orange-900"}`}>
                  {companyReadiness.ok ? "Empresa lista para generar XML tributario" : "Faltan datos del emisor para una emision consistente"}
                </p>
                <p className={`mt-1 text-sm ${companyReadiness.ok ? "text-emerald-800" : "text-orange-800"}`}>
                  {companyReadiness.ok ? "El envio real requiere firma XAdES configurada en la Edge Function y ambiente de produccion habilitado." : `Completa: ${companyReadiness.errors.join(", ")}.`}
                </p>
              </div>
              <div className="grid gap-4 rounded-xl border bg-muted/30 p-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <p className="font-medium">Ambiente SRI</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pruebas permite certificar el flujo sin validez tributaria. Produccion emite comprobantes publicamente validos cuando el SRI los autoriza.
                  </p>
                </div>
                <Select
                  value={companyForm.sri_environment}
                  onValueChange={(value) => void handleSaveSriSettings({ sri_environment: value })}
                  disabled={savingSriSettings}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pruebas">Pruebas</SelectItem>
                    <SelectItem value="produccion">Produccion</SelectItem>
                  </SelectContent>
                </Select>
                <div>
                  <p className="font-medium">Habilitar emision en produccion</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Activalo solo cuando la empresa tenga firma electronica vigente, autorizacion SRI y el servicio de firma configurado.
                  </p>
                </div>
                <div className="flex items-center justify-end">
                  <Switch
                    checked={companyForm.sri_emission_enabled}
                    onCheckedChange={(checked) => void handleSaveSriSettings({ sri_emission_enabled: checked })}
                    disabled={savingSriSettings}
                  />
                </div>
                <div className="md:col-span-2 flex items-center justify-end text-xs text-muted-foreground">
                  {savingSriSettings ? "Guardando estado SRI..." : "Los cambios de ambiente SRI se guardan automaticamente."}
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {companyReadiness.items.map((item) => (
                  <div key={item.key} className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.ready ? "bg-emerald-500" : "bg-orange-500"}`} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Firma electronica SRI</CardTitle>
              <CardDescription>Sube el archivo .p12 o .pfx de la empresa. La clave se cifra en el backend y no se guarda en el navegador.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`rounded-xl border p-4 ${company?.sri_certificate_uploaded_at ? "border-emerald-200 bg-emerald-50/70" : "border-orange-200 bg-orange-50/70"}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className={`font-medium ${company?.sri_certificate_uploaded_at ? "text-emerald-900" : "text-orange-900"}`}>
                      {company?.sri_certificate_uploaded_at ? "Firma electronica cargada" : "Firma electronica pendiente"}
                    </p>
                    <p className={`mt-1 text-sm ${company?.sri_certificate_uploaded_at ? "text-emerald-800" : "text-orange-800"}`}>
                      {company?.sri_certificate_uploaded_at
                        ? `${company.sri_certificate_filename || "firma-electronica.p12"} cargada el ${new Date(company.sri_certificate_uploaded_at).toLocaleString()}.`
                        : "Cada empresa debe cargar su propio archivo de firma antes de emitir comprobantes reales."}
                    </p>
                  </div>
                  {company?.sri_certificate_uploaded_at && (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => setReplacingSignature((current) => !current)} disabled={savingSignature}>
                        {replacingSignature ? "Cancelar reemplazo" : "Reemplazar firma"}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleSignatureDelete} disabled={savingSignature}>
                        Eliminar firma
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {(!company?.sri_certificate_uploaded_at || replacingSignature) ? (
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)_auto] md:items-end">
                  <Field label="Archivo de firma">
                    <Input
                      ref={signatureInputRef}
                      type="file"
                      accept=".p12,.pfx,application/x-pkcs12"
                      onChange={(event) => setSignatureFile(event.target.files?.[0] || null)}
                    />
                  </Field>
                  <Field label="Clave de la firma">
                    <Input
                      type="password"
                      value={signaturePassword}
                      onChange={(event) => setSignaturePassword(event.target.value)}
                      placeholder="Clave del .p12/.pfx"
                      autoComplete="new-password"
                    />
                  </Field>
                  <Button type="button" onClick={handleSignatureUpload} disabled={savingSignature}>
                    {savingSignature ? "Guardando..." : company?.sri_certificate_uploaded_at ? "Guardar reemplazo" : "Guardar firma"}
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  La firma ya esta almacenada de forma privada para esta empresa. No necesitas volver a seleccionar el archivo; usa "Reemplazar firma" solo si el certificado cambia o vence.
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                El archivo queda en un bucket privado por empresa. ContaNova lo usa internamente para firmar el XML antes de enviarlo al SRI.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logotipo de la empresa</CardTitle>
              <CardDescription>Se mostrara en el sidebar, topbar y comprobantes emitidos.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30">
                  {logoUrl ? <img src={logoUrl} alt="Logo empresa" className="h-full w-full object-contain" /> : <ImageIcon className="h-8 w-8 text-muted-foreground/50" />}
                </div>
                <div className="space-y-2">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo}>
                    <Upload className="mr-1 h-4 w-4" />
                    {uploadingLogo ? "Subiendo..." : "Subir logo"}
                  </Button>
                  <p className="text-xs text-muted-foreground">PNG, JPG o SVG. Maximo 2MB.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Apariencia</CardTitle>
              <CardDescription>Controla el tema general y los colores de los estados comerciales.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">Modo oscuro</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Puedes alternar entre claro y oscuro desde aqui o desde el icono de la barra superior.
                  </p>
                </div>
                <ThemeToggle />
              </div>

              <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
                <div>
                  <p className="font-medium">Colores de etiquetas</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Estos colores se aplican a estados como emitida, enviada, pagada y observada dentro de la empresa.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {[
                    ["borrador", "Borrador"],
                    ["emitida", "Emitida"],
                    ["enviada", "Enviada"],
                    ["pagada", "Pagada"],
                    ["observada", "Observada"],
                    ["anulada", "Anulada"],
                  ].map(([key, label]) => (
                    <div key={key} className="rounded-xl border bg-background p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">{statusColors[key as StatusColorKey]}</p>
                        </div>
                        <span
                          className="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: `${statusColors[key as StatusColorKey]}22`,
                            borderColor: `${statusColors[key as StatusColorKey]}55`,
                            color: statusColors[key as StatusColorKey],
                          }}
                        >
                          {label}
                        </span>
                      </div>
                      <Input
                        type="color"
                        value={statusColors[key as StatusColorKey]}
                        onChange={(event) =>
                          setStatusColors((prev) => ({
                            ...prev,
                            [key]: event.target.value,
                          }))
                        }
                        className="h-11 w-full cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informacion tributaria</CardTitle>
              <CardDescription>Datos fiscales requeridos para emitir comprobantes.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="RUC"><Input value={companyForm.ruc} onChange={(event) => setCompanyForm((prev) => ({ ...prev, ruc: event.target.value }))} maxLength={13} /></Field>
              <Field label="Razon social"><Input value={companyForm.name} onChange={(event) => setCompanyForm((prev) => ({ ...prev, name: event.target.value }))} /></Field>
              <Field label="Establecimiento"><Input value={companyForm.establecimiento} onChange={(event) => setCompanyForm((prev) => ({ ...prev, establecimiento: event.target.value.replace(/\D/g, "").slice(0, 3) }))} maxLength={3} /></Field>
              <Field label="Punto de emision"><Input value={companyForm.punto_emision} onChange={(event) => setCompanyForm((prev) => ({ ...prev, punto_emision: event.target.value.replace(/\D/g, "").slice(0, 3) }))} maxLength={3} /></Field>
              <Field label="Direccion" className="md:col-span-2"><Input value={companyForm.address} onChange={(event) => setCompanyForm((prev) => ({ ...prev, address: event.target.value }))} /></Field>
              <Field label="Telefono"><Input value={companyForm.phone} onChange={(event) => setCompanyForm((prev) => ({ ...prev, phone: event.target.value }))} /></Field>
              <Field label="Email"><Input value={companyForm.email} onChange={(event) => setCompanyForm((prev) => ({ ...prev, email: event.target.value }))} /></Field>
            </CardContent>
          </Card>

          {canManageBillingPreferences && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Envio automatico</CardTitle>
                <CardDescription>Cuando crees una factura, ContaNova puede emitirla al SRI y enviarla al correo del cliente sin usar botones manuales.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">Enviar al SRI automaticamente</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Al crear una factura, ContaNova generara el XML, firmara con la firma electronica cargada y solicitara autorizacion al SRI antes del envio por correo.
                    </p>
                  </div>
                  <Switch
                    checked={companyForm.auto_send_invoice_sri}
                    onCheckedChange={(checked) => setCompanyForm((prev) => ({ ...prev, auto_send_invoice_sri: checked }))}
                  />
                </div>
                <div className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">Enviar correo automaticamente</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Usa el correo registrado en el cliente. Si tambien activas SRI automatico, el PDF se arma con el estado y autorizacion SRI que se obtenga en ese momento.
                    </p>
                  </div>
                  <Switch
                    checked={companyForm.auto_send_invoice_email}
                    onCheckedChange={(checked) => setCompanyForm((prev) => ({ ...prev, auto_send_invoice_email: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {canManageBillingPreferences && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  WhatsApp Business
                </CardTitle>
                <CardDescription>Configura el canal de WhatsApp de esta empresa para enviar facturas y avisos desde ContaNova.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
                    <div>
                      <p className="font-medium">Canal activo</p>
                      <p className="text-xs text-muted-foreground">Permite usar WhatsApp en facturas.</p>
                    </div>
                    <Switch
                      checked={companyForm.whatsapp_enabled}
                      onCheckedChange={(checked) => setCompanyForm((prev) => ({ ...prev, whatsapp_enabled: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
                    <div>
                      <p className="font-medium">Envio automatico</p>
                      <p className="text-xs text-muted-foreground">Enviar al crear una factura.</p>
                    </div>
                    <Switch
                      checked={companyForm.auto_send_invoice_whatsapp}
                      onCheckedChange={(checked) => setCompanyForm((prev) => ({ ...prev, auto_send_invoice_whatsapp: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
                    <div>
                      <p className="font-medium">Modo simulado</p>
                      <p className="text-xs text-muted-foreground">Prueba sin enviar mensajes reales.</p>
                    </div>
                    <Switch
                      checked={companyForm.whatsapp_simulation_mode}
                      onCheckedChange={(checked) => setCompanyForm((prev) => ({ ...prev, whatsapp_simulation_mode: checked }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Phone Number ID">
                    <Input value={companyForm.whatsapp_phone_number_id} onChange={(event) => setCompanyForm((prev) => ({ ...prev, whatsapp_phone_number_id: event.target.value.trim() }))} placeholder="123456789012345" />
                  </Field>
                  <Field label="Business Account ID">
                    <Input value={companyForm.whatsapp_business_account_id} onChange={(event) => setCompanyForm((prev) => ({ ...prev, whatsapp_business_account_id: event.target.value.trim() }))} placeholder="123456789012345" />
                  </Field>
                  <Field label="Plantilla de factura">
                    <Input value={companyForm.whatsapp_template_name} onChange={(event) => setCompanyForm((prev) => ({ ...prev, whatsapp_template_name: event.target.value.trim() }))} placeholder="factura_emitida" />
                  </Field>
                  <Field label="Idioma de plantilla">
                    <Input value={companyForm.whatsapp_template_language} onChange={(event) => setCompanyForm((prev) => ({ ...prev, whatsapp_template_language: event.target.value.trim() || "es" }))} placeholder="es" />
                  </Field>
                  <Field label="Access token" className="md:col-span-2">
                    <div className="space-y-2">
                      <Input
                        type="password"
                        value={whatsappAccessToken}
                        onChange={(event) => setWhatsappAccessToken(event.target.value)}
                        placeholder={companyForm.whatsapp_token_configured ? "Token guardado. Pega uno nuevo solo si quieres reemplazarlo." : "Pega aqui el token permanente de Meta"}
                        autoComplete="off"
                      />
                      <p className="text-xs text-muted-foreground">
                        {companyForm.whatsapp_token_configured
                          ? "Hay un token guardado para esta empresa. No se muestra por seguridad."
                          : "El token se guardara protegido en Supabase al guardar la configuracion."}
                      </p>
                    </div>
                  </Field>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Switch checked={autoSaveConfig} onCheckedChange={setAutoSaveConfig} />
              <div>
                <p className="font-medium">Autoguardar cambios</p>
                <p className="text-xs text-muted-foreground">
                  Guarda automaticamente ajustes, apariencia, SRI, correo y WhatsApp. El token de WhatsApp se guarda con el boton manual.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {autoSaveStatus === "pending" && <Clock3 className="h-4 w-4" />}
                {autoSaveStatus === "saving" && <RefreshCw className="h-4 w-4 animate-spin" />}
                {autoSaveStatus === "saved" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {autoSaveStatus === "error" && <Shield className="h-4 w-4 text-destructive" />}
                <span>
                  {autoSaveStatus === "pending" && "Cambios pendientes"}
                  {autoSaveStatus === "saving" && "Guardando..."}
                  {autoSaveStatus === "saved" && "Guardado"}
                  {autoSaveStatus === "error" && "No se pudo autoguardar"}
                  {autoSaveStatus === "idle" && (autoSaveConfig ? "Autoguardado activo" : "Autoguardado apagado")}
                </span>
              </div>
              <Button onClick={handleSaveCompany} disabled={updateCompany.isPending || updateAppearance.isPending}>
                {updateCompany.isPending || updateAppearance.isPending ? "Guardando..." : "Guardar ahora"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {isCompanyAdmin && (
          <TabsContent value="usuarios" className="mt-4 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Panel de accesos</CardTitle>
                  <CardDescription>Gestiona los usuarios internos de tu empresa.</CardDescription>
                </div>
                <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><UserPlus className="mr-1 h-4 w-4" />Crear acceso</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Crear nuevo acceso</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <Field label="Nombre completo"><Input value={newUser.full_name} onChange={(event) => setNewUser((prev) => ({ ...prev, full_name: event.target.value }))} /></Field>
                      <Field label="Correo electronico"><Input type="email" value={newUser.email} onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))} /></Field>
                      <Field label="Contrasena">
                        <div className="flex gap-2">
                          <Input type="text" value={newUser.password} onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))} />
                          <Button type="button" variant="outline" onClick={() => setNewUser((prev) => ({ ...prev, password: generatePassword() }))}>
                            <RefreshCw className="mr-1 h-4 w-4" />
                            Generar
                          </Button>
                        </div>
                      </Field>
                      <Field label="Rol">
                        <Select value={newUser.role} onValueChange={(value) => setNewUser((prev) => ({ ...prev, role: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="contador">Contador</SelectItem>
                            <SelectItem value="empleado">Empleado</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Button className="w-full" onClick={handleCreateUser} disabled={creating}>{creating ? "Creando..." : "Crear acceso"}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="mb-6 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  El registro publico esta desactivado. Todos los accesos se crean desde aqui.
                </div>

                {latestCredentials?.mode === "user" && (
                  <CredentialsCard title="Ultimo acceso creado" description="Entrega estas credenciales al colaborador." onCopy={handleCopyCredentials}>
                    <InfoTile label="Nombre" value={latestCredentials.full_name} />
                    <InfoTile label="Rol" value={latestCredentials.role} />
                    <InfoTile label="Correo" value={latestCredentials.email} />
                    <InfoTile label="Clave temporal" value={latestCredentials.password} mono />
                  </CredentialsCard>
                )}

                {loadingUsers ? (
                  <Spinner />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Correo</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => {
                        const badge = userStatus(user);
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.full_name || "-"}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {roleIcon[user.role]}
                                <Select defaultValue={user.role} onValueChange={(value) => handleUpdateRole(user.id, value)}>
                                  <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                    <SelectItem value="contador">Contador</SelectItem>
                                    <SelectItem value="empleado">Empleado</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant={badge.variant} className="gap-1.5">{badge.icon}{badge.label}</Badge></TableCell>
                            <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id, user.full_name)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                          </TableRow>
                        );
                      })}
                      {users.length === 0 && <EmptyRow colSpan={5} text="No hay accesos registrados." />}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className || ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" /></div>;
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return <TableRow><TableCell colSpan={colSpan} className="py-8 text-center text-muted-foreground">{text}</TableCell></TableRow>;
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="mt-2 text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function CredentialsCard({
  title,
  description,
  onCopy,
  children,
}: {
  title: string;
  description: string;
  onCopy: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-primary/20 bg-background/80 hover:bg-background"
          onClick={onCopy}
        >
          <Copy className="mr-1 h-4 w-4" />
          Copiar
        </Button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{children}</div>
    </div>
  );
}


