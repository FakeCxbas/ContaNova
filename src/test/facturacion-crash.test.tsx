import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Facturacion from "@/modules/facturacion/Facturacion";

vi.mock("@/services/companies", () => ({
  useCompanyId: () => ({ data: "company-bolivar-id", isLoading: false }),
  useCompany: () => ({
    data: { id: "company-bolivar-id", name: "Electromecánica Bolívar" },
    isLoading: false,
  }),
}));

vi.mock("@/services/clients", () => ({
  useClients: () => ({ data: [], isLoading: false }),
  useCreateClient: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/services/products", () => ({
  useProducts: () => ({ data: [], isLoading: false }),
  useUpdateProduct: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/services/invoices", () => ({
  useInvoices: () => ({ data: [], isLoading: false }),
  useCreateInvoice: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateInvoice: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("Facturacion component crash test", () => {
  it("renders without crashing and opens Nuevo comprobante for Electromecánica Bolívar with 0 clients", () => {
    render(
      <BrowserRouter>
        <Facturacion />
      </BrowserRouter>
    );

    expect(screen.getByText("Facturacion")).toBeInTheDocument();
    const newBtn = screen.getByText(/Nuevo comprobante/i);
    expect(newBtn).toBeInTheDocument();

    // Click Nuevo comprobante
    fireEvent.click(newBtn);

    // Verify it opened without throwing
    expect(screen.getByText(/Informacion general/i)).toBeInTheDocument();
  });
});
