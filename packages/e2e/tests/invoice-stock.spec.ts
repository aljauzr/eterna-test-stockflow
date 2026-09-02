import { expect, test } from "@playwright/test";
import {
  createAuthHeaders,
  findInvoiceByNumber,
  findProductBySku,
  loginViaApi,
} from "../helpers/api";
import { apiBaseUrl, resetDemoData } from "../helpers/demo-data";

test.describe("invoice stock rules", () => {
  test.beforeEach(() => {
    resetDemoData();
  });

  test("rejects invoicing more than the available stock", async ({ request }) => {
    const token = await loginViaApi(request);
    const product = await findProductBySku(request, token, "OAT-001");

    const response = await request.post(`${apiBaseUrl}/invoices`, {
      headers: createAuthHeaders(token),
      data: {
        customerName: "Stock Guard Review",
        issueDate: "2026-09-09",
        dueDate: "2026-09-16",
        notes: "Should fail because quantity exceeds stock.",
        items: [
          {
            productId: product.id,
            quantity: product.quantityOnHand + 1,
          },
        ],
      },
    });

    expect(response.status()).toBe(422);

    const body = (await response.json()) as {
      message: string;
      errors?: Record<string, string[]>;
    };

    expect(body.message).toBe("Validation failed");
    expect(body.errors?.items?.[0]).toContain(product.name);
    expect(body.errors?.items?.[0]).toContain("available stock");
  });

  test("decrements stock when a draft invoice is issued", async ({ request }) => {
    const token = await loginViaApi(request);
    const coffeeBefore = await findProductBySku(request, token, "COF-001");
    const cupsBefore = await findProductBySku(request, token, "CUP-001");
    const invoice = await findInvoiceByNumber(request, token, "INV-2026-0001", "DRAFT");

    const response = await request.patch(`${apiBaseUrl}/invoices/${invoice.id}/status`, {
      headers: createAuthHeaders(token),
      data: { status: "ISSUED" },
    });

    await expect(response).toBeOK();

    const coffeeAfter = await findProductBySku(request, token, "COF-001");
    const cupsAfter = await findProductBySku(request, token, "CUP-001");

    expect(coffeeAfter.quantityOnHand).toBe(coffeeBefore.quantityOnHand - 2);
    expect(cupsAfter.quantityOnHand).toBe(cupsBefore.quantityOnHand - 10);

    const updatedInvoiceResponse = await request.get(`${apiBaseUrl}/invoices/${invoice.id}`, {
      headers: createAuthHeaders(token),
    });
    await expect(updatedInvoiceResponse).toBeOK();

    const updatedInvoice = (await updatedInvoiceResponse.json()) as {
      data: {
        status: string;
      };
    };

    expect(updatedInvoice.data.status).toBe("ISSUED");
  });

  test("restores stock when an issued invoice is cancelled", async ({ request }) => {
    const token = await loginViaApi(request);
    const oatMilkBefore = await findProductBySku(request, token, "OAT-001");
    const lemonBefore = await findProductBySku(request, token, "LEM-001");
    const invoice = await findInvoiceByNumber(request, token, "INV-2026-0003", "ISSUED");

    const response = await request.patch(`${apiBaseUrl}/invoices/${invoice.id}/status`, {
      headers: createAuthHeaders(token),
      data: { status: "CANCELLED" },
    });

    await expect(response).toBeOK();

    const oatMilkAfter = await findProductBySku(request, token, "OAT-001");
    const lemonAfter = await findProductBySku(request, token, "LEM-001");

    expect(oatMilkAfter.quantityOnHand).toBe(oatMilkBefore.quantityOnHand + 3);
    expect(lemonAfter.quantityOnHand).toBe(lemonBefore.quantityOnHand + 5);

    const updatedInvoiceResponse = await request.get(`${apiBaseUrl}/invoices/${invoice.id}`, {
      headers: createAuthHeaders(token),
    });
    await expect(updatedInvoiceResponse).toBeOK();

    const updatedInvoice = (await updatedInvoiceResponse.json()) as {
      data: {
        status: string;
      };
    };

    expect(updatedInvoice.data.status).toBe("CANCELLED");
  });
});
