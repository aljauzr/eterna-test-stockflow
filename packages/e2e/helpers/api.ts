import { APIRequestContext, expect } from "@playwright/test";
import { apiBaseUrl, demoUser } from "./demo-data";

type AuthResponse = {
  success: boolean;
  data: {
    accessToken: string;
    user: {
      id: string;
      email: string;
    };
  };
};

type Product = {
  id: string;
  sku: string;
  name: string;
  quantityOnHand: number;
};

type ProductsResponse = {
  success: boolean;
  data: {
    items: Product[];
  };
};

type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "CANCELLED";
};

type InvoicesResponse = {
  success: boolean;
  data: {
    items: InvoiceSummary[];
  };
};

export async function loginViaApi(request: APIRequestContext) {
  const response = await request.post(`${apiBaseUrl}/auth/login`, {
    data: demoUser,
  });

  await expect(response).toBeOK();
  const body = (await response.json()) as AuthResponse;
  return body.data.accessToken;
}

export function createAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function listProducts(request: APIRequestContext, token: string) {
  const response = await request.get(`${apiBaseUrl}/products?page=1&limit=20&search=`, {
    headers: createAuthHeaders(token),
  });

  await expect(response).toBeOK();
  return (await response.json()) as ProductsResponse;
}

export async function findProductBySku(request: APIRequestContext, token: string, sku: string) {
  const products = await listProducts(request, token);
  const product = products.data.items.find((item) => item.sku === sku);
  expect(product, `Expected product with SKU ${sku} to exist in the seeded catalog.`).toBeTruthy();
  return product as Product;
}

export async function findInvoiceByNumber(
  request: APIRequestContext,
  token: string,
  invoiceNumber: string,
  status = "",
) {
  const response = await request.get(
    `${apiBaseUrl}/invoices?page=1&limit=20&status=${encodeURIComponent(status)}`,
    {
      headers: createAuthHeaders(token),
    },
  );

  await expect(response).toBeOK();
  const body = (await response.json()) as InvoicesResponse;
  const invoice = body.data.items.find((item) => item.invoiceNumber === invoiceNumber);
  expect(invoice, `Expected invoice ${invoiceNumber} to exist in the seeded data.`).toBeTruthy();
  return invoice as InvoiceSummary;
}
