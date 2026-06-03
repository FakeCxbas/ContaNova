import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession,
    },
  },
}));

describe("invoiceEmailService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
  });

  it("uses the active session JWT instead of the anon key", async () => {
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "session-jwt",
        },
      },
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { invoiceEmailService } = await import("@/services/invoiceEmailService");

    await invoiceEmailService.send({
      recipientEmail: "cliente@example.com",
      subject: "Factura",
      invoiceNumber: "FAC-001",
      companyName: "ContaNova",
      pdfBase64: "ZmFrZQ==",
      filename: "factura.pdf",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/functions/v1/send-invoice-email",
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "anon-key",
          Authorization: "Bearer session-jwt",
        }),
      }),
    );
  });

  it("fails fast when the session token is missing", async () => {
    getSession.mockResolvedValue({
      data: {
        session: null,
      },
    });

    const { invoiceEmailService } = await import("@/services/invoiceEmailService");

    await expect(
      invoiceEmailService.send({
        recipientEmail: "cliente@example.com",
        subject: "Factura",
        invoiceNumber: "FAC-001",
        companyName: "ContaNova",
        pdfBase64: "ZmFrZQ==",
        filename: "factura.pdf",
      }),
    ).rejects.toThrow("Tu sesion expiro. Vuelve a iniciar sesion.");
  });
});
