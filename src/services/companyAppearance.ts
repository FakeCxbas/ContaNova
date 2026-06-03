import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { normalizeInvoiceStatus, type CommercialInvoiceStatus } from "@/lib/invoice-status";
import { useCompanyId } from "@/services/companies";

export type StatusColorKey = CommercialInvoiceStatus;

export type CompanyAppearance = {
  statusColors: Record<StatusColorKey, string>;
};

const defaultAppearance: CompanyAppearance = {
  statusColors: {
    borrador: "#64748b",
    emitida: "#0ea5e9",
    enviada: "#2563eb",
    pagada: "#16a34a",
    anulada: "#dc2626",
    observada: "#f97316",
  },
};

const storageKey = (companyId: string) => `contanova:appearance:${companyId}`;

function isValidHex(value: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

function expandHex(hex: string) {
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

function hexToRgb(hex: string) {
  const normalized = expandHex(hex).replace("#", "");
  const bigint = Number.parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(Math.max(0, Math.min(255, Math.round(r))))}${toHex(Math.max(0, Math.min(255, Math.round(g))))}${toHex(Math.max(0, Math.min(255, Math.round(b))))}`;
}

function mixHex(baseHex: string, targetHex: string, amount: number) {
  const base = hexToRgb(baseHex);
  const target = hexToRgb(targetHex);

  return rgbToHex({
    r: base.r + (target.r - base.r) * amount,
    g: base.g + (target.g - base.g) * amount,
    b: base.b + (target.b - base.b) * amount,
  });
}

function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function readAppearance(companyId: string): CompanyAppearance {
  if (typeof window === "undefined") return defaultAppearance;

  const raw = window.localStorage.getItem(storageKey(companyId));
  if (!raw) return defaultAppearance;

  try {
    const parsed = JSON.parse(raw) as Partial<CompanyAppearance>;
    return {
      statusColors: {
        ...defaultAppearance.statusColors,
        ...Object.fromEntries(
          Object.entries(parsed.statusColors || {}).filter(([, value]) => typeof value === "string" && isValidHex(value)),
        ),
      } as Record<StatusColorKey, string>,
    };
  } catch {
    return defaultAppearance;
  }
}

function writeAppearance(companyId: string, appearance: CompanyAppearance) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(companyId), JSON.stringify(appearance));
}

export function useCompanyAppearance() {
  const { data: companyId } = useCompanyId();

  return useQuery({
    queryKey: ["company-appearance", companyId],
    queryFn: () => readAppearance(companyId!),
    enabled: !!companyId,
    initialData: defaultAppearance,
  });
}

export function useUpdateCompanyAppearance() {
  const qc = useQueryClient();
  const { data: companyId } = useCompanyId();

  return useMutation({
    mutationFn: async (appearance: CompanyAppearance) => {
      if (!companyId) return;
      writeAppearance(companyId, appearance);
      return appearance;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-appearance", companyId] });
    },
  });
}

export function getStatusBadgeStyle(status: string | null | undefined, appearance: CompanyAppearance, isDark: boolean) {
  const normalized = normalizeInvoiceStatus(status) as StatusColorKey;
  const color = appearance.statusColors[normalized] || defaultAppearance.statusColors[normalized];
  const textColor = isDark ? mixHex(color, "#ffffff", 0.2) : mixHex(color, "#111827", 0.18);

  return {
    backgroundColor: withAlpha(color, isDark ? 0.18 : 0.14),
    borderColor: withAlpha(color, isDark ? 0.34 : 0.24),
    color: textColor,
  };
}

export function useInvoiceStatusAppearance(status: string | null | undefined) {
  const { data: appearance = defaultAppearance } = useCompanyAppearance();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return {
    appearance,
    style: getStatusBadgeStyle(status, appearance, isDark),
  };
}

export { defaultAppearance };
