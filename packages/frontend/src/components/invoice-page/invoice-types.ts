export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "CANCELLED";

export type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  notes: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  itemCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type InvoiceDetail = InvoiceSummary & {
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
};

export type InvoiceFormLineItem = {
  productId: string;
  quantity: string;
};

export type InvoiceFormState = {
  customerName: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  items: InvoiceFormLineItem[];
};

export type InvoiceFieldErrors = {
  customerName: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  items: string;
};

export type ProductCatalogItem = {
  id: string;
  sku: string;
  name: string;
  description: string;
  unitPrice: number;
  quantityOnHand: number;
};
