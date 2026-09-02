"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ApiError, apiRequest } from "../../lib/api";
import { getStoredAccessToken } from "../../lib/auth-storage";
import { DashboardShell } from "../dashboard-shell/dashboard-shell";
import { InvoiceDetailDrawer } from "./invoice-detail-drawer";
import { InvoiceFormDrawer } from "./invoice-form-drawer";
import {
  InvoiceDetail,
  InvoiceFieldErrors,
  InvoiceFormState,
  InvoiceSummary,
  InvoiceStatus,
  ProductCatalogItem,
} from "./invoice-types";
import styles from "./invoice-page.module.css";

type InvoicesResponse = {
  success: boolean;
  data: {
    items: InvoiceSummary[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    filters: {
      status: string;
    };
  };
};

type InvoiceResponse = {
  success: boolean;
  data: InvoiceDetail;
};

type ProductCatalogResponse = {
  success: boolean;
  data: {
    items: ProductCatalogItem[];
  };
};

const emptyPagination = {
  page: 1,
  limit: 6,
  totalItems: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

const emptyFieldErrors: InvoiceFieldErrors = {
  customerName: "",
  issueDate: "",
  dueDate: "",
  notes: "",
  items: "",
};

function createEmptyLineItem() {
  return {
    productId: "",
    quantity: "1",
  };
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function toDateInputValue(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createEmptyForm(): InvoiceFormState {
  const today = new Date();

  return {
    customerName: "",
    issueDate: toDateInputValue(today),
    dueDate: toDateInputValue(addDays(today, 7)),
    notes: "",
    items: [createEmptyLineItem()],
  };
}

function formatMinorCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getStatusClassName(status: InvoiceStatus) {
  if (status === "ISSUED") {
    return `${styles.statusBadge} ${styles.statusIssued}`;
  }

  if (status === "PAID") {
    return `${styles.statusBadge} ${styles.statusPaid}`;
  }

  if (status === "CANCELLED") {
    return `${styles.statusBadge} ${styles.statusCancelled}`;
  }

  return `${styles.statusBadge} ${styles.statusDraft}`;
}

export function InvoicePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [statusFilter, setStatusFilter] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [form, setForm] = useState<InvoiceFormState>(createEmptyForm());
  const [fieldErrors, setFieldErrors] = useState(emptyFieldErrors);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [detailActionError, setDetailActionError] = useState("");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const isEditing = editingInvoiceId !== null;

  const getAuthHeaders = useCallback(() => {
    const accessToken = getStoredAccessToken();

    if (!accessToken) {
      router.replace("/login");
      return null;
    }

    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }, [router]);

  const loadInvoices = useCallback(
    async (page: number, status: string) => {
      const headers = getAuthHeaders();
      if (!headers) {
        return;
      }

      setIsLoading(true);
      setActionError("");

      try {
        const response = await apiRequest<InvoicesResponse>(
          `/invoices?page=${page}&limit=${emptyPagination.limit}&status=${encodeURIComponent(status)}`,
          {
            headers,
          },
        );

        setInvoices(response.data.items);
        setPagination(response.data.pagination);
        setAppliedStatus(response.data.filters.status);
        setStatusFilter(response.data.filters.status);
      } catch (error) {
        if (error instanceof ApiError && error.message === "Authentication required") {
          router.replace("/login");
          return;
        }

        setActionError(
          error instanceof ApiError
            ? error.message
            : "Unable to load invoices right now. Please try again.",
        );
      } finally {
        setIsLoading(false);
        setHasLoadedOnce(true);
      }
    },
    [getAuthHeaders, router],
  );

  const loadProductCatalog = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) {
      return;
    }

    setIsLoadingCatalog(true);

    try {
      const response = await apiRequest<ProductCatalogResponse>("/products/catalog", {
        headers,
      });
      setProducts(response.data.items);
    } catch (error) {
      if (error instanceof ApiError && error.message === "Authentication required") {
        router.replace("/login");
        return;
      }

      setActionError(
        error instanceof ApiError
          ? error.message
          : "Unable to load products for invoice creation right now.",
      );
    } finally {
      setIsLoadingCatalog(false);
    }
  }, [getAuthHeaders, router]);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    void Promise.all([loadInvoices(1, ""), loadProductCatalog()]);
  }, [loadInvoices, loadProductCatalog]);

  function resetFormState() {
    setForm(createEmptyForm());
    setFieldErrors(emptyFieldErrors);
    setFormError("");
    setEditingInvoiceId(null);
  }

  const openCreateDrawer = useCallback(() => {
    resetFormState();
    setActionError("");
    setActionMessage("");
    setIsFormOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("drawer") !== "create") {
      return;
    }

    openCreateDrawer();

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("drawer");
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    router.replace(nextUrl);
  }, [openCreateDrawer, pathname, router, searchParams]);

  function closeFormDrawer() {
    resetFormState();
    setIsFormOpen(false);
  }

  function mapInvoiceDetailToForm(invoice: InvoiceDetail): InvoiceFormState {
    return {
      customerName: invoice.customerName,
      issueDate: toDateInputValue(invoice.issueDate),
      dueDate: toDateInputValue(invoice.dueDate),
      notes: invoice.notes,
      items: invoice.items.map((item) => ({
        productId: item.productId,
        quantity: String(item.quantity),
      })),
    };
  }

  async function fetchInvoiceDetail(invoiceId: string) {
    const headers = getAuthHeaders();
    if (!headers) {
      return null;
    }

    const response = await apiRequest<InvoiceResponse>(`/invoices/${invoiceId}`, {
      headers,
    });

    return response.data;
  }

  async function openInvoiceDetail(invoiceId: string) {
    setActionError("");
    setActionMessage("");
    setDetailActionError("");

    try {
      const invoice = await fetchInvoiceDetail(invoiceId);
      if (!invoice) {
        return;
      }

      setSelectedInvoice(invoice);
      setIsDetailOpen(true);
    } catch (error) {
      if (error instanceof ApiError && error.message === "Authentication required") {
        router.replace("/login");
        return;
      }

      setActionError(
        error instanceof ApiError
          ? error.message
          : "Unable to load invoice details right now. Please try again.",
      );
    }
  }

  function closeInvoiceDetail() {
    if (isUpdatingStatus) {
      return;
    }

    setIsDetailOpen(false);
    setSelectedInvoice(null);
    setDetailActionError("");
  }

  async function openEditDrawer(invoiceId: string) {
    try {
      const invoice = await fetchInvoiceDetail(invoiceId);
      if (!invoice) {
        return;
      }

      setEditingInvoiceId(invoice.id);
      setForm(mapInvoiceDetailToForm(invoice));
      setFieldErrors(emptyFieldErrors);
      setFormError("");
      setActionError("");
      setActionMessage("");
      setDetailActionError("");
      setIsDetailOpen(false);
      setSelectedInvoice(invoice);
      setIsFormOpen(true);
    } catch (error) {
      if (error instanceof ApiError && error.message === "Authentication required") {
        router.replace("/login");
        return;
      }

      setActionError(
        error instanceof ApiError
          ? error.message
          : "Unable to load the draft invoice right now. Please try again.",
      );
    }
  }

  function buildInvoicePayload() {
    return {
      customerName: form.customerName,
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      notes: form.notes,
      items: form.items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const headers = getAuthHeaders();
    if (!headers) {
      return;
    }

    setIsSubmitting(true);
    setFieldErrors(emptyFieldErrors);
    setFormError("");
    setActionError("");
    setActionMessage("");

    try {
      const payload = buildInvoicePayload();
      const response = await apiRequest<InvoiceResponse>(
        isEditing ? `/invoices/${editingInvoiceId}` : "/invoices",
        {
          method: isEditing ? "PATCH" : "POST",
          headers,
          body: JSON.stringify(payload),
        },
      );

      closeFormDrawer();
      setSelectedInvoice(response.data);
      await loadInvoices(isEditing ? pagination.page : 1, appliedStatus);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors({
          customerName: error.fieldErrors?.customerName?.[0] ?? "",
          issueDate: error.fieldErrors?.issueDate?.[0] ?? "",
          dueDate: error.fieldErrors?.dueDate?.[0] ?? "",
          notes: error.fieldErrors?.notes?.[0] ?? "",
          items: error.fieldErrors?.items?.[0] ?? "",
        });

        if (error.message === "Authentication required") {
          router.replace("/login");
        }
      } else {
        setFormError("Unable to save this invoice right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(nextStatus: InvoiceStatus) {
    if (!selectedInvoice) {
      return;
    }

    const headers = getAuthHeaders();
    if (!headers) {
      return;
    }

    setIsUpdatingStatus(true);
    setActionMessage("");
    setDetailActionError("");

    try {
      const response = await apiRequest<InvoiceResponse>(
        `/invoices/${selectedInvoice.id}/status`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      setSelectedInvoice(response.data);
      setActionMessage(`Invoice ${response.data.invoiceNumber} updated to ${response.data.status}.`);
      await Promise.all([
        loadInvoices(pagination.page, appliedStatus),
        loadProductCatalog(),
      ]);
    } catch (error) {
      if (error instanceof ApiError && error.message === "Authentication required") {
        router.replace("/login");
        return;
      }

      if (error instanceof ApiError) {
        const nextErrorMessage =
          error.fieldErrors?.items?.[0] ??
          error.fieldErrors?.status?.[0] ??
          error.fieldErrors?.customerName?.[0] ??
          error.message;

        setDetailActionError(nextErrorMessage);
      } else {
        setDetailActionError("Unable to update the invoice status right now. Please try again.");
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  function handleFormChange(field: keyof InvoiceFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleLineItemChange(
    index: number,
    field: keyof InvoiceFormState["items"][number],
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    }));
  }

  function handleAddLineItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, createEmptyLineItem()],
    }));
  }

  function handleRemoveLineItem(index: number) {
    setForm((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? current.items
          : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  const statusSummary = useMemo(() => {
    if (!appliedStatus) {
      return "All statuses";
    }

    return appliedStatus;
  }, [appliedStatus]);
  const showInitialSkeleton = !hasHydrated || (!hasLoadedOnce && isLoading);

  return (
    <DashboardShell>
      <main className={styles.page}>
        {showInitialSkeleton ? (
          <section className={styles.toolbar}>
            <div className={styles.toolbarSkeleton}>
              <span className={`${styles.skeletonBlock} ${styles.skeletonLabel}`} />
              <span className={`${styles.skeletonBlock} ${styles.skeletonInput}`} />
            </div>
            <span className={`${styles.skeletonBlock} ${styles.skeletonButton}`} />
          </section>
        ) : (
          <section className={styles.toolbar}>
            <label className={styles.filterField}>
              <span className={styles.filterLabel}>Filter by status</span>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">All statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="ISSUED">Issued</option>
                <option value="PAID">Paid</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>

            <div className={styles.toolbarActions}>
              <button
                className={styles.addButton}
                type="button"
                onClick={() => void loadInvoices(1, statusFilter)}
              >
                Apply Filter
              </button>
            </div>
          </section>
        )}

        {actionMessage ? <div className={styles.successBanner}>{actionMessage}</div> : null}
        {actionError ? <div className={styles.errorBanner}>{actionError}</div> : null}

        <section className={styles.listSection}>
          {showInitialSkeleton ? (
            <>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionHeaderSkeleton}>
                  <span className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
                  <span className={`${styles.skeletonBlock} ${styles.skeletonText}`} />
                </div>
                <span className={`${styles.skeletonBlock} ${styles.skeletonButton}`} />
              </div>

              <div className={styles.tableWrapper}>
                <div className={styles.skeletonTable}>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={`invoice-skeleton-${index}`} className={styles.skeletonRow}>
                      <span className={`${styles.skeletonBlock} ${styles.skeletonCellMedium}`} />
                      <span className={`${styles.skeletonBlock} ${styles.skeletonCellMedium}`} />
                      <span className={`${styles.skeletonBlock} ${styles.skeletonCellShort}`} />
                      <span className={`${styles.skeletonBlock} ${styles.skeletonCellShort}`} />
                      <span className={`${styles.skeletonBlock} ${styles.skeletonCellShort}`} />
                      <span className={`${styles.skeletonBlock} ${styles.skeletonCellMedium}`} />
                      <span className={`${styles.skeletonBlock} ${styles.skeletonCellAction}`} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Invoices</h2>
                <p className={styles.sectionDescription}>
                  {pagination.totalItems} invoice{pagination.totalItems === 1 ? "" : "s"} found in{" "}
                  {statusSummary}.
                </p>
              </div>

              <div className={styles.headerActions}>
                <button
                  className={styles.addButton}
                  type="button"
                  onClick={openCreateDrawer}
                  disabled={isLoadingCatalog}
                >
                  Create Invoice
                </button>
              </div>
            </div>
          )}

          {!showInitialSkeleton && isLoading ? <div className={styles.emptyState}>Loading invoices...</div> : null}

          {!showInitialSkeleton && !isLoading && invoices.length === 0 ? (
            <div className={styles.emptyState}>
              No invoices yet. Create your first invoice to start tracking customer billing.
            </div>
          ) : null}

          {!showInitialSkeleton && !isLoading && invoices.length > 0 ? (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.tableHead}>Invoice Number</th>
                    <th className={styles.tableHead}>Customer</th>
                    <th className={styles.tableHead}>Issue Date</th>
                    <th className={styles.tableHead}>Due Date</th>
                    <th className={styles.tableHead}>Status</th>
                    <th className={`${styles.tableHead} ${styles.tableHeadRight}`}>Total</th>
                    <th className={`${styles.tableHead} ${styles.tableHeadRight}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className={styles.tableRow}>
                      <td className={styles.tableCell}>
                        <span className={styles.invoiceNumber}>{invoice.invoiceNumber}</span>
                      </td>
                      <td className={styles.tableCell}>
                        <span className={styles.customerName}>{invoice.customerName}</span>
                      </td>
                      <td className={styles.tableCell}>{formatDate(invoice.issueDate)}</td>
                      <td className={styles.tableCell}>{formatDate(invoice.dueDate)}</td>
                      <td className={styles.tableCell}>
                        <span className={getStatusClassName(invoice.status)}>{invoice.status}</span>
                      </td>
                      <td className={`${styles.tableCell} ${styles.tableCellRight}`}>
                        {formatMinorCurrency(invoice.total)}
                      </td>
                      <td className={`${styles.tableCell} ${styles.tableCellRight}`}>
                        <div className={styles.rowActions}>
                          <button
                            className={styles.tableButton}
                            type="button"
                            onClick={() => void openInvoiceDetail(invoice.id)}
                          >
                            View
                          </button>
                          {invoice.status === "DRAFT" ? (
                            <button
                              className={styles.secondaryButton}
                              type="button"
                              onClick={() => void openEditDrawer(invoice.id)}
                            >
                              Edit
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className={styles.pagination}>
            <button
              className={styles.paginationButton}
              type="button"
              onClick={() => void loadInvoices(pagination.page - 1, appliedStatus)}
              disabled={!pagination.hasPreviousPage || isLoading}
            >
              Previous
            </button>
            <span className={styles.paginationInfo}>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              className={styles.paginationButton}
              type="button"
              onClick={() => void loadInvoices(pagination.page + 1, appliedStatus)}
              disabled={!pagination.hasNextPage || isLoading}
            >
              Next
            </button>
          </div>
        </section>
      </main>

      <InvoiceFormDrawer
        isOpen={isFormOpen}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        products={products}
        form={form}
        fieldErrors={fieldErrors}
        formError={formError}
        onClose={closeFormDrawer}
        onSubmit={handleSubmit}
        onChange={handleFormChange}
        onLineItemChange={handleLineItemChange}
        onAddLineItem={handleAddLineItem}
        onRemoveLineItem={handleRemoveLineItem}
      />

      <InvoiceDetailDrawer
        invoice={selectedInvoice}
        isOpen={isDetailOpen}
        isUpdatingStatus={isUpdatingStatus}
        actionError={detailActionError}
        onClose={closeInvoiceDetail}
        onEdit={() => void (selectedInvoice ? openEditDrawer(selectedInvoice.id) : Promise.resolve())}
        onStatusChange={(status) => void handleStatusChange(status)}
      />
    </DashboardShell>
  );
}
