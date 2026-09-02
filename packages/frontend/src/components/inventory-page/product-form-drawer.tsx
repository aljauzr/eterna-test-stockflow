"use client";

import { useState } from "react";
import styles from "./product-form-drawer.module.css";

export type ProductFormState = {
  sku: string;
  name: string;
  description: string;
  unitPrice: string;
  quantityOnHand: string;
};

export type ProductFieldErrors = {
  sku: string;
  name: string;
  description: string;
  unitPrice: string;
  quantityOnHand: string;
};

export type ProductSubmitMode = "save" | "saveAndAddAnother";

type ProductFormDrawerProps = {
  isEditing: boolean;
  isOpen: boolean;
  isVisible: boolean;
  isSubmitting: boolean;
  form: ProductFormState;
  fieldErrors: ProductFieldErrors;
  formError: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>, mode: ProductSubmitMode) => void;
  onChange: (field: keyof ProductFormState, value: string) => void;
};

export function ProductFormDrawer({
  isEditing,
  isOpen,
  isVisible,
  isSubmitting,
  form,
  fieldErrors,
  formError,
  onClose,
  onSubmit,
  onChange,
}: ProductFormDrawerProps) {
  const [submitMode, setSubmitMode] = useState<ProductSubmitMode>("save");

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`${styles.overlay}${isVisible ? ` ${styles.overlayOpen}` : ""}`}
      onClick={isSubmitting ? undefined : onClose}
    >
      <section
        className={`${styles.panel}${isVisible ? ` ${styles.panelOpen}` : ""}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Update Product" : "Add Product"}
      >
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{isEditing ? "Update Product" : "Add Product"}</h2>
          </div>

          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </div>

        <form className={styles.form} onSubmit={(event) => onSubmit(event, submitMode)}>
          <label className={styles.field}>
            <span className={styles.label}>SKU*</span>
            <input
              className={styles.input}
              value={form.sku}
              onChange={(event) => onChange("sku", event.target.value)}
              placeholder="SKU-001"
              required
            />
            {fieldErrors.sku ? <span className={styles.fieldError}>{fieldErrors.sku}</span> : null}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Product Name*</span>
            <input
              className={styles.input}
              value={form.name}
              onChange={(event) => onChange("name", event.target.value)}
              required
            />
            {fieldErrors.name ? <span className={styles.fieldError}>{fieldErrors.name}</span> : null}
          </label>

          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span className={styles.label}>Description (optional)</span>
            <textarea
              className={styles.textarea}
              value={form.description}
              onChange={(event) => onChange("description", event.target.value)}
              maxLength={150}
              rows={4}
            />
            {fieldErrors.description ? (
              <span className={styles.fieldError}>{fieldErrors.description}</span>
            ) : null}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Unit Price*</span>
            <input
              className={styles.input}
              type="number"
              min="0"
              step="0.01"
              value={form.unitPrice}
              onChange={(event) => onChange("unitPrice", event.target.value)}
              placeholder="0.00"
              required
            />
            {fieldErrors.unitPrice ? (
              <span className={styles.fieldError}>{fieldErrors.unitPrice}</span>
            ) : null}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Quantity*</span>
            <input
              className={styles.input}
              type="number"
              min="0"
              step="1"
              value={form.quantityOnHand}
              onChange={(event) => onChange("quantityOnHand", event.target.value)}
              placeholder="0"
              required
            />
            {fieldErrors.quantityOnHand ? (
              <span className={styles.fieldError}>{fieldErrors.quantityOnHand}</span>
            ) : null}
          </label>

          <div className={styles.actions}>
            {!isEditing ? (
              <button
                className={styles.secondaryButton}
                type="submit"
                disabled={isSubmitting}
                onClick={() => setSubmitMode("saveAndAddAnother")}
              >
                {isSubmitting && submitMode === "saveAndAddAnother"
                  ? "Saving..."
                  : "Save and add another"}
              </button>
            ) : null}
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={isSubmitting}
              onClick={() => setSubmitMode("save")}
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
