"use client";

import {
  InvoiceFieldErrors,
  InvoiceFormState,
  ProductCatalogItem,
} from "./invoice-types";
import styles from "./invoice-form-drawer.module.css";

type InvoiceFormDrawerProps = {
  isOpen: boolean;
  isEditing: boolean;
  isSubmitting: boolean;
  taxRateLabel: string;
  products: ProductCatalogItem[];
  form: InvoiceFormState;
  fieldErrors: InvoiceFieldErrors;
  formError: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onChange: (field: keyof InvoiceFormState, value: string) => void;
  onLineItemChange: (
    index: number,
    field: keyof InvoiceFormState["items"][number],
    value: string,
  ) => void;
  onAddLineItem: () => void;
  onRemoveLineItem: (index: number) => void;
};

function formatMinorCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function InvoiceFormDrawer({
  isOpen,
  isEditing,
  isSubmitting,
  taxRateLabel,
  products,
  form,
  fieldErrors,
  formError,
  onClose,
  onSubmit,
  onChange,
  onLineItemChange,
  onAddLineItem,
  onRemoveLineItem,
}: InvoiceFormDrawerProps) {
  if (!isOpen) {
    return null;
  }

  const taxRateBasisPoints = parseTaxRateBasisPoints(taxRateLabel);
  const summary = form.items.reduce(
    (current, item) => {
      const selectedProduct = products.find((product) => product.id === item.productId);
      const quantity = Number(item.quantity);

      if (!selectedProduct || !Number.isFinite(quantity) || quantity <= 0) {
        return current;
      }

      const unitPriceMinor = Math.round(selectedProduct.unitPrice * 100);
      current.subtotal += unitPriceMinor * quantity;
      current.items += quantity;
      return current;
    },
    {
      subtotal: 0,
      items: 0,
    },
  );
  const taxAmount = Math.round((summary.subtotal * taxRateBasisPoints) / 10000);
  const total = summary.subtotal + taxAmount;

  return (
    <div className={styles.overlay} onClick={isSubmitting ? undefined : onClose}>
      <section
        className={styles.panel}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Update Invoice" : "Create Invoice"}
      >
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{isEditing ? "Update Invoice" : "Create Invoice"}</h2>
          </div>

          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>Customer Name*</span>
            <input
              className={styles.input}
              value={form.customerName}
              onChange={(event) => onChange("customerName", event.target.value)}
              required
            />
            {fieldErrors.customerName ? (
              <span className={styles.fieldError}>{fieldErrors.customerName}</span>
            ) : null}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Issue Date*</span>
            <input
              className={styles.input}
              type="date"
              value={form.issueDate}
              onChange={(event) => onChange("issueDate", event.target.value)}
              required
            />
            {fieldErrors.issueDate ? (
              <span className={styles.fieldError}>{fieldErrors.issueDate}</span>
            ) : null}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Due Date*</span>
            <input
              className={styles.input}
              type="date"
              value={form.dueDate}
              onChange={(event) => onChange("dueDate", event.target.value)}
              required
            />
            {fieldErrors.dueDate ? (
              <span className={styles.fieldError}>{fieldErrors.dueDate}</span>
            ) : null}
          </label>

          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span className={styles.label}>Notes (optional)</span>
            <textarea
              className={styles.textarea}
              value={form.notes}
              onChange={(event) => onChange("notes", event.target.value)}
              rows={4}
              maxLength={300}
            />
            {fieldErrors.notes ? <span className={styles.fieldError}>{fieldErrors.notes}</span> : null}
          </label>

          <section className={styles.lineItemsSection}>
            <div className={styles.lineItemHeader}>
              <div>
                <h3 className={styles.lineItemsTitle}>Line Items</h3>
              </div>

              <button
                className={`${styles.secondaryButton} ${styles.lineItemAddButton}`}
                type="button"
                onClick={onAddLineItem}
              >
                Add Item
              </button>
            </div>

            {fieldErrors.items ? <div className={styles.lineItemsError}>{fieldErrors.items}</div> : null}

            <div className={styles.lineItemsList}>
              {form.items.map((item, index) => {
                const selectedProduct = products.find((product) => product.id === item.productId);

                return (
                  <div key={`invoice-line-${index}`} className={styles.lineItemRow}>
                    <label className={styles.lineItemField}>
                      <span className={styles.lineItemLabel}>Product*</span>
                      <select
                        className={styles.select}
                        value={item.productId}
                        onChange={(event) => onLineItemChange(index, "productId", event.target.value)}
                        required
                      >
                        <option value="">Select a product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.sku} - {product.name}
                          </option>
                        ))}
                      </select>
                      {selectedProduct ? (
                        <span className={styles.lineItemMeta}>
                          In stock: {selectedProduct.quantityOnHand} | Unit price:{" "}
                          {formatMinorCurrency(Math.round(selectedProduct.unitPrice * 100))}
                        </span>
                      ) : null}
                    </label>

                    <label className={styles.lineItemField}>
                      <span className={styles.lineItemLabel}>Quantity*</span>
                      <input
                        className={styles.input}
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(event) => onLineItemChange(index, "quantity", event.target.value)}
                        placeholder="1"
                        required
                      />
                    </label>

                    <button
                      className={styles.lineItemRemoveButton}
                      type="button"
                      onClick={() => onRemoveLineItem(index)}
                      disabled={form.items.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.summarySection}>
            <h3 className={styles.summaryTitle}>Summary</h3>

            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Subtotal</span>
                <span className={styles.summaryValue}>{formatMinorCurrency(summary.subtotal)}</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>{`Tax (${taxRateLabel}%)`}</span>
                <span className={styles.summaryValue}>{formatMinorCurrency(taxAmount)}</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Total</span>
                <span className={styles.summaryValue}>{formatMinorCurrency(total)}</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Items</span>
                <span className={styles.summaryValue}>{summary.items}</span>
              </div>
            </div>
          </section>

          <div className={styles.actions}>
            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function parseTaxRateBasisPoints(value: string) {
  const normalizedValue = value.trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalizedValue);

  if (!match) {
    return 1100;
  }

  const integerPart = Number(match[1]) * 100;
  const decimalPart = Number((match[2] ?? "").padEnd(2, "0") || "0");
  return integerPart + decimalPart;
}
