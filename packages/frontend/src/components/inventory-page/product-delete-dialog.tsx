"use client";

import styles from "./product-delete-dialog.module.css";

type ProductDeleteDialogProps = {
  isOpen: boolean;
  productName: string;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ProductDeleteDialog({
  isOpen,
  productName,
  isDeleting,
  onClose,
  onConfirm,
}: ProductDeleteDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={styles.overlay}
      onClick={isDeleting ? undefined : onClose}
      role="presentation"
    >
      <section
        className={styles.dialog}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Delete product confirmation"
      >
        <div className={styles.content}>
          <h2 className={styles.title}>Delete Product</h2>
          <p className={styles.description}>
            Delete &quot;{productName}&quot;? Products already used in invoices cannot be removed.
          </p>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className={styles.dangerButton}
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </section>
    </div>
  );
}
