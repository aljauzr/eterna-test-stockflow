"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiRequest } from "../../lib/api";
import { getStoredAccessToken } from "../../lib/auth-storage";
import { DashboardShell } from "../dashboard-shell/dashboard-shell";
import styles from "./inventory-page.module.css";

type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  unitPrice: number;
  quantityOnHand: number;
  createdAt: string | null;
  updatedAt: string | null;
};

type ProductsResponse = {
  success: boolean;
  data: {
    items: Product[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    filters: {
      search: string;
    };
  };
};

type ProductResponse = {
  success: boolean;
  data: Product;
};

type ProductFormState = {
  sku: string;
  name: string;
  description: string;
  unitPrice: string;
  quantityOnHand: string;
};

const emptyForm: ProductFormState = {
  sku: "",
  name: "",
  description: "",
  unitPrice: "",
  quantityOnHand: "",
};

const emptyFieldErrors = {
  sku: "",
  name: "",
  description: "",
  unitPrice: "",
  quantityOnHand: "",
};

const emptyPagination = {
  page: 1,
  limit: 6,
  totalItems: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

export function InventoryPageContent() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState(emptyFieldErrors);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );

  const isEditing = editingProductId !== null;

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

  const loadProducts = useCallback(
    async (page: number, search: string) => {
      const headers = getAuthHeaders();
      if (!headers) {
        return;
      }

      setIsLoading(true);
      setActionError("");

      try {
        const response = await apiRequest<ProductsResponse>(
          `/products?page=${page}&limit=${emptyPagination.limit}&search=${encodeURIComponent(search)}`,
          {
            headers,
          },
        );

        setProducts(response.data.items);
        setPagination(response.data.pagination);
        setAppliedSearch(response.data.filters.search);
        setSearchInput(response.data.filters.search);
      } catch (error) {
        if (error instanceof ApiError && error.message === "Authentication required") {
          router.replace("/login");
          return;
        }

        setActionError(
          error instanceof ApiError
            ? error.message
            : "Unable to load products right now. Please try again.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [getAuthHeaders, router],
  );

  useEffect(() => {
    void loadProducts(1, "");
  }, [loadProducts]);

  function resetFormState() {
    setForm(emptyForm);
    setFieldErrors(emptyFieldErrors);
    setFormError("");
    setEditingProductId(null);
  }

  function openCreateForm() {
    resetFormState();
    setIsFormOpen(true);
    setActionMessage("");
    setActionError("");
  }

  function closeForm() {
    resetFormState();
    setIsFormOpen(false);
  }

  function handleEdit(product: Product) {
    setEditingProductId(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      description: product.description,
      unitPrice: String(product.unitPrice),
      quantityOnHand: String(product.quantityOnHand),
    });
    setFieldErrors(emptyFieldErrors);
    setFormError("");
    setIsFormOpen(true);
    setActionMessage("");
    setActionError("");
  }

  function buildProductPayload() {
    const unitPriceValue =
      form.unitPrice.trim() === "" || Number.isNaN(Number(form.unitPrice))
        ? undefined
        : Number(form.unitPrice);
    const quantityOnHandValue =
      form.quantityOnHand.trim() === "" || Number.isNaN(Number(form.quantityOnHand))
        ? undefined
        : Number(form.quantityOnHand);

    return {
      sku: form.sku,
      name: form.name,
      description: form.description,
      unitPrice: unitPriceValue,
      quantityOnHand: quantityOnHandValue,
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
    setActionMessage("");
    setActionError("");

    try {
      const payload = buildProductPayload();
      const response = await apiRequest<ProductResponse>(
        isEditing ? `/products/${editingProductId}` : "/products",
        {
          method: isEditing ? "PATCH" : "POST",
          headers,
          body: JSON.stringify(payload),
        },
      );

      closeForm();
      setActionMessage(
        isEditing
          ? `Product "${response.data.name}" updated successfully.`
          : `Product "${response.data.name}" created successfully.`,
      );

      await loadProducts(isEditing ? pagination.page : 1, appliedSearch);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors({
          sku: error.fieldErrors?.sku?.[0] ?? "",
          name: error.fieldErrors?.name?.[0] ?? "",
          description: error.fieldErrors?.description?.[0] ?? "",
          unitPrice: error.fieldErrors?.unitPrice?.[0] ?? "",
          quantityOnHand: error.fieldErrors?.quantityOnHand?.[0] ?? "",
        });

        if (error.message === "Authentication required") {
          router.replace("/login");
        }
      } else {
        setFormError("Unable to save this product right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(product: Product) {
    const headers = getAuthHeaders();
    if (!headers) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${product.name}"? Products already used in invoices cannot be removed.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingProductId(product.id);
    setActionMessage("");
    setActionError("");

    try {
      await apiRequest(`/products/${product.id}`, {
        method: "DELETE",
        headers,
      });

      const nextPage =
        products.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;

      setActionMessage(`Product "${product.name}" deleted successfully.`);
      await loadProducts(nextPage, appliedSearch);
    } catch (error) {
      if (error instanceof ApiError && error.message === "Authentication required") {
        router.replace("/login");
        return;
      }

      setActionError(
        error instanceof ApiError
          ? error.message
          : "Unable to delete this product right now. Please try again.",
      );
    } finally {
      setDeletingProductId(null);
    }
  }

  function formatMoney(value: number) {
    return `USD ${numberFormatter.format(value)}`;
  }

  function formatTimestamp(value: string | null) {
    if (!value) {
      return "Not available";
    }

    return dateFormatter.format(new Date(value));
  }

  return (
    <DashboardShell>
      <main className={styles.page}>
        <section className={styles.hero}>
          <form className={styles.searchForm} onSubmit={(event) => {
            event.preventDefault();
            void loadProducts(1, searchInput.trim());
          }}>
            <label className={styles.searchField}>
              <input
                className={styles.searchInput}
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by product name or SKU"
              />
            </label>

            <div className={styles.searchActions}>
              <button className={styles.searchButton} type="submit">
                Search
              </button>
            </div>
          </form>
        </section>

        {isFormOpen ? (
          <section className={styles.formCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  {isEditing ? "Edit Product" : "Add Product"}
                </h2>
              </div>

              <button type="button" className={styles.formCloseButton} onClick={closeForm}>
                Close
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}>
                <span className={styles.label}>SKU</span>
                <input
                  className={styles.input}
                  value={form.sku}
                  onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))}
                  placeholder="SKU-001"
                  required
                />
                {fieldErrors.sku ? <span className={styles.fieldError}>{fieldErrors.sku}</span> : null}
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Product Name</span>
                <input
                  className={styles.input}
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Wireless Barcode Scanner"
                  required
                />
                {fieldErrors.name ? <span className={styles.fieldError}>{fieldErrors.name}</span> : null}
              </label>

              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.label}>Description</span>
                <textarea
                  className={styles.textarea}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Optional product notes"
                  rows={4}
                />
                {fieldErrors.description ? (
                  <span className={styles.fieldError}>{fieldErrors.description}</span>
                ) : null}
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Unit Price</span>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitPrice}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, unitPrice: event.target.value }))
                  }
                  placeholder="0.00"
                  required
                />
                {fieldErrors.unitPrice ? (
                  <span className={styles.fieldError}>{fieldErrors.unitPrice}</span>
                ) : null}
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Quantity on Hand</span>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  step="1"
                  value={form.quantityOnHand}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, quantityOnHand: event.target.value }))
                  }
                  placeholder="0"
                  required
                />
                {fieldErrors.quantityOnHand ? (
                  <span className={styles.fieldError}>{fieldErrors.quantityOnHand}</span>
                ) : null}
              </label>

              {formError ? <div className={styles.formError}>{formError}</div> : null}

              <div className={styles.formActions}>
                <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : isEditing ? "Update Product" : "Save Product"}
                </button>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={closeForm}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {actionMessage ? <div className={styles.successBanner}>{actionMessage}</div> : null}
        {actionError ? <div className={styles.errorBanner}>{actionError}</div> : null}

        <section className={styles.listSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Products</h2>
              <p className={styles.sectionDescription}>
                {pagination.totalItems} product{pagination.totalItems === 1 ? "" : "s"} found
                {appliedSearch ? ` for "${appliedSearch}"` : ""}.
              </p>
            </div>

            <div className={styles.headerActions}>
              <button className={styles.addButton} type="button" onClick={openCreateForm}>
                {isFormOpen && !isEditing ? "Add Another Product" : "Add Product"}
              </button>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => void loadProducts(pagination.page, appliedSearch)}
              >
                Refresh List
              </button>
            </div>
          </div>

          {isLoading ? <div className={styles.emptyState}>Loading products...</div> : null}

          {!isLoading && products.length === 0 ? (
            <div className={styles.emptyState}>
              {appliedSearch
                ? "No products match your current search."
                : "No products yet. Add your first product to start tracking inventory."}
            </div>
          ) : null}

          {!isLoading && products.length > 0 ? (
            <div className={styles.grid}>
              {products.map((product) => (
                <article key={product.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <span className={styles.cardSku}>{product.sku}</span>
                      <h3 className={styles.cardTitle}>{product.name}</h3>
                    </div>

                    <div className={styles.cardActions}>
                      <button
                        className={styles.cardButton}
                        type="button"
                        onClick={() => handleEdit(product)}
                      >
                        Edit
                      </button>
                      <button
                        className={`${styles.cardButton} ${styles.cardButtonDanger}`}
                        type="button"
                        onClick={() => void handleDelete(product)}
                        disabled={deletingProductId === product.id}
                      >
                        {deletingProductId === product.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>

                  <p className={styles.cardDescription}>
                    {product.description || "No description provided for this product."}
                  </p>

                  <dl className={styles.metaList}>
                    <div className={styles.metaItem}>
                      <dt className={styles.metaLabel}>Unit Price</dt>
                      <dd className={styles.metaValue}>{formatMoney(product.unitPrice)}</dd>
                    </div>
                    <div className={styles.metaItem}>
                      <dt className={styles.metaLabel}>Quantity on Hand</dt>
                      <dd className={styles.metaValue}>{product.quantityOnHand}</dd>
                    </div>
                    <div className={styles.metaItem}>
                      <dt className={styles.metaLabel}>Created</dt>
                      <dd className={styles.metaValue}>{formatTimestamp(product.createdAt)}</dd>
                    </div>
                    <div className={styles.metaItem}>
                      <dt className={styles.metaLabel}>Last Updated</dt>
                      <dd className={styles.metaValue}>{formatTimestamp(product.updatedAt)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : null}

          <div className={styles.pagination}>
            <button
              className={styles.paginationButton}
              type="button"
              onClick={() => void loadProducts(pagination.page - 1, appliedSearch)}
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
              onClick={() => void loadProducts(pagination.page + 1, appliedSearch)}
              disabled={!pagination.hasNextPage || isLoading}
            >
              Next
            </button>
          </div>
        </section>
      </main>
    </DashboardShell>
  );
}
