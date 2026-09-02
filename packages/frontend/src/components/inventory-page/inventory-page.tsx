"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ApiError, apiRequest } from "../../lib/api";
import { getStoredAccessToken } from "../../lib/auth-storage";
import { DashboardShell } from "../dashboard-shell/dashboard-shell";
import {
  ProductFieldErrors,
  ProductFormDrawer,
  ProductFormState,
  ProductSubmitMode,
} from "./product-form-drawer";
import { ProductDeleteDialog } from "./product-delete-dialog";
import styles from "./inventory-page.module.css";

type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  unitPrice: number;
  quantityOnHand: number;
  canDelete: boolean;
  deleteDisabledReason: string | null;
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

type SuggestedSkuResponse = {
  success: boolean;
  data: {
    sku: string;
  };
};

const emptyForm: ProductFormState = {
  sku: "",
  name: "",
  description: "",
  unitPrice: "",
  quantityOnHand: "",
};

const emptyFieldErrors: ProductFieldErrors = {
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

const DRAWER_ANIMATION_MS = 280;

function parseSequentialSkuNumber(sku: string) {
  const match = /^SKU-(\d+)$/i.exec(sku.trim());

  if (!match) {
    return 0;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatSequentialSkuNumber(value: number) {
  return `SKU-${String(value).padStart(3, "0")}`;
}

function getNextSequentialSku(skus: string[]) {
  const maxValue = skus.reduce((currentMax, sku) => {
    return Math.max(currentMax, parseSequentialSkuNumber(sku));
  }, 0);

  return formatSequentialSkuNumber(maxValue + 1);
}

export function InventoryPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState(emptyFieldErrors);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [productPendingDelete, setProductPendingDelete] = useState<Product | null>(null);
  const [activeDeleteTooltipId, setActiveDeleteTooltipId] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const closeDrawerTimeoutRef = useRef<number | null>(null);

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
        setHasLoadedOnce(true);
      }
    },
    [getAuthHeaders, router],
  );

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    void loadProducts(1, "");
  }, [loadProducts]);

  useEffect(() => {
    return () => {
      if (closeDrawerTimeoutRef.current) {
        window.clearTimeout(closeDrawerTimeoutRef.current);
      }
    };
  }, []);

  const resolveSuggestedSku = useCallback(
    (serverSku?: string | null, extraSkus: string[] = []) => {
      const fallbackSku = getNextSequentialSku([
        ...products.map((product) => product.sku),
        ...extraSkus,
      ]);

      if (!serverSku) {
        return fallbackSku;
      }

      const serverValue = parseSequentialSkuNumber(serverSku);
      const fallbackValue = parseSequentialSkuNumber(fallbackSku);

      return serverValue >= fallbackValue ? serverSku : fallbackSku;
    },
    [products],
  );

  const loadSuggestedSku = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) {
      return null;
    }

    try {
      const response = await apiRequest<SuggestedSkuResponse>("/products/suggested-sku", {
        headers,
      });

      return response.data.sku;
    } catch (error) {
      if (error instanceof ApiError && error.message === "Authentication required") {
        router.replace("/login");
      }

      return null;
    }
  }, [getAuthHeaders, router]);

  function resetFormState(nextSku = "") {
    setForm({
      ...emptyForm,
      sku: nextSku,
    });
    setFieldErrors(emptyFieldErrors);
    setFormError("");
    setEditingProductId(null);
  }

  const clearCloseDrawerTimeout = useCallback(() => {
    if (closeDrawerTimeoutRef.current) {
      window.clearTimeout(closeDrawerTimeoutRef.current);
      closeDrawerTimeoutRef.current = null;
    }
  }, []);

  const openFormDrawer = useCallback(() => {
    clearCloseDrawerTimeout();
    setIsFormOpen(true);

    window.requestAnimationFrame(() => {
      setIsFormVisible(true);
    });
  }, [clearCloseDrawerTimeout]);

  const openCreateForm = useCallback(async () => {
    const suggestedSku = await loadSuggestedSku();
    resetFormState(resolveSuggestedSku(suggestedSku));
    setActionMessage("");
    setActionError("");
    openFormDrawer();
  }, [loadSuggestedSku, openFormDrawer, resolveSuggestedSku]);

  useEffect(() => {
    if (searchParams.get("drawer") !== "create") {
      return;
    }

    void openCreateForm();

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("drawer");
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    router.replace(nextUrl);
  }, [openCreateForm, pathname, router, searchParams]);

  function closeForm() {
    clearCloseDrawerTimeout();
    setIsFormVisible(false);
    closeDrawerTimeoutRef.current = window.setTimeout(() => {
      resetFormState();
      setIsFormOpen(false);
      closeDrawerTimeoutRef.current = null;
    }, DRAWER_ANIMATION_MS);
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
    setActionMessage("");
    setActionError("");
    openFormDrawer();
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>, mode: ProductSubmitMode) {
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

      if (isEditing || mode === "save") {
        closeForm();
      } else {
        const suggestedSku = await loadSuggestedSku();
        resetFormState(resolveSuggestedSku(suggestedSku, [response.data.sku]));
      }

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

  function openDeleteDialog(product: Product) {
    setProductPendingDelete(product);
    setActiveDeleteTooltipId(null);
    setActionMessage("");
    setActionError("");
  }

  function closeDeleteDialog() {
    if (deletingProductId) {
      return;
    }

    setProductPendingDelete(null);
  }

  async function handleDeleteConfirm() {
    if (!productPendingDelete) {
      return;
    }

    const headers = getAuthHeaders();
    if (!headers) {
      return;
    }

    setDeletingProductId(productPendingDelete.id);
    setActionMessage("");
    setActionError("");

    try {
      await apiRequest(`/products/${productPendingDelete.id}`, {
        method: "DELETE",
        headers,
      });

      const nextPage =
        products.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
        
      setProductPendingDelete(null);
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

  function handleFormChange(field: keyof ProductFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  const showInitialSkeleton = !hasHydrated || (!hasLoadedOnce && isLoading);

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
                onChange={(event) => {
                  const nextValue = event.target.value;

                  setSearchInput(nextValue);

                  if (nextValue === "" && appliedSearch !== "") {
                    void loadProducts(1, "");
                  }
                }}
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
                    <div key={`inventory-skeleton-${index}`} className={styles.skeletonRow}>
                      <span className={`${styles.skeletonBlock} ${styles.skeletonCellShort}`} />
                      <span className={`${styles.skeletonBlock} ${styles.skeletonCellMedium}`} />
                      <span className={`${styles.skeletonBlock} ${styles.skeletonCellLong}`} />
                      <span className={`${styles.skeletonBlock} ${styles.skeletonCellMedium}`} />
                      <span className={`${styles.skeletonBlock} ${styles.skeletonCellShort}`} />
                      <span className={`${styles.skeletonBlock} ${styles.skeletonCellAction}`} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Products</h2>
                  <p className={styles.sectionDescription}>
                    {pagination.totalItems} product{pagination.totalItems === 1 ? "" : "s"} found
                    {appliedSearch ? ` for "${appliedSearch}"` : ""}.
                  </p>
                </div>

                <div className={styles.headerActions}>
                  <button className={styles.addButton} type="button" onClick={() => void openCreateForm()}>
                    Add Product
                  </button>
                </div>
              </div>
            </>
          )}

          {!showInitialSkeleton && isLoading ? <div className={styles.emptyState}>Loading products...</div> : null}

          {!showInitialSkeleton && !isLoading && products.length === 0 ? (
            <div className={styles.emptyState}>
              {appliedSearch
                ? "No products match your current search."
                : "No products yet. Add your first product to start tracking inventory."}
            </div>
          ) : null}

          {!showInitialSkeleton && !isLoading && products.length > 0 ? (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.tableHead}>SKU</th>
                    <th className={styles.tableHead}>Product Name</th>
                    <th className={styles.tableHead}>Description</th>
                    <th className={styles.tableHead}>Unit Price</th>
                    <th className={styles.tableHead}>Quantity</th>
                    <th className={`${styles.tableHead} ${styles.tableHeadActions}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className={styles.tableRow}>
                      <td className={styles.tableCell}>
                        <span className={styles.skuBadge}>{product.sku}</span>
                      </td>
                      <td className={styles.tableCell}>
                        <span className={styles.productName}>{product.name}</span>
                      </td>
                      <td className={styles.tableCell}>
                        <span className={styles.descriptionText}>
                          {product.description}
                        </span>
                      </td>
                      <td className={styles.tableCell}>{formatMoney(product.unitPrice)}</td>
                      <td className={styles.tableCell}>{product.quantityOnHand}</td>
                      <td className={`${styles.tableCell} ${styles.tableCellActions}`}>
                        <div className={styles.rowActions}>
                          <button
                            className={styles.cardButton}
                            type="button"
                            onClick={() => handleEdit(product)}
                          >
                            Update
                          </button>
                          {(() => {
                            const canDelete = product.canDelete !== false;
                            const deleteDisabledReason = canDelete
                              ? ""
                              : "Already linked to an invoice.";

                            return (
                              <div
                                className={`${styles.deleteActionWrapper}${canDelete ? "" : ` ${styles.deleteActionWrapperDisabled}`}`}
                                onMouseEnter={() => {
                                  if (!canDelete) {
                                    setActiveDeleteTooltipId(product.id);
                                  }
                                }}
                                onMouseLeave={() => {
                                  if (!canDelete) {
                                    setActiveDeleteTooltipId((current) =>
                                      current === product.id ? null : current,
                                    );
                                  }
                                }}
                                onFocus={() => {
                                  if (!canDelete) {
                                    setActiveDeleteTooltipId(product.id);
                                  }
                                }}
                                onBlur={() => {
                                  if (!canDelete) {
                                    setActiveDeleteTooltipId((current) =>
                                      current === product.id ? null : current,
                                    );
                                  }
                                }}
                              >
                            <button
                              className={`${styles.cardButton} ${styles.cardButtonDanger}${canDelete ? "" : ` ${styles.cardButtonMuted}`}`}
                              type="button"
                              onClick={() => {
                                if (canDelete) {
                                  openDeleteDialog(product);
                                }
                              }}
                              disabled={!canDelete || deletingProductId === product.id}
                              aria-describedby={!canDelete ? `delete-tooltip-${product.id}` : undefined}
                            >
                              {deletingProductId === product.id ? "Deleting..." : "Delete"}
                            </button>
                                {!canDelete ? (
                                  <span
                                    id={`delete-tooltip-${product.id}`}
                                    className={`${styles.deleteTooltip}${activeDeleteTooltipId === product.id ? ` ${styles.deleteTooltipVisible}` : ""}`}
                                  >
                                    {deleteDisabledReason}
                                  </span>
                                ) : null}
                              </div>
                            );
                          })()}
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

      <ProductFormDrawer
        isEditing={isEditing}
        isOpen={isFormOpen}
        isVisible={isFormVisible}
        isSubmitting={isSubmitting}
        form={form}
        fieldErrors={fieldErrors}
        formError={formError}
        onClose={closeForm}
        onSubmit={handleSubmit}
        onChange={handleFormChange}
      />

      <ProductDeleteDialog
        isOpen={productPendingDelete !== null}
        productName={productPendingDelete?.name ?? ""}
        isDeleting={deletingProductId === productPendingDelete?.id}
        onClose={closeDeleteDialog}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </DashboardShell>
  );
}
