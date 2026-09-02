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
