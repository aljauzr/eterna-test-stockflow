"use client";

import { InvoiceDetail } from "./invoice-types";
import styles from "./invoice-detail-drawer.module.css";

type InvoiceDetailDrawerProps = {
  invoice: InvoiceDetail | null;
  isOpen: boolean;
  isUpdatingStatus: boolean;
  actionError: string;
  taxRateLabel: string;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (status: InvoiceDetail["status"]) => void;
};

function formatMinorCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getStatusClassName(status: InvoiceDetail["status"]) {
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

export function InvoiceDetailDrawer({
  invoice,
  isOpen,
  isUpdatingStatus,
  actionError,
  taxRateLabel,
  onClose,
  onEdit,
  onStatusChange,
}: InvoiceDetailDrawerProps) {
  if (!isOpen || !invoice) {
    return null;
  }

  return (
    <div className={styles.overlay} onClick={isUpdatingStatus ? undefined : onClose}>
      <section
        className={styles.panel}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Invoice details"
      >
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{invoice.invoiceNumber}</h2>
            <p className={styles.subtitle}>{invoice.customerName}</p>
          </div>

          <div>
            <span className={getStatusClassName(invoice.status)}>{invoice.status}</span>
          </div>
        </div>

        <section className={styles.section}>
          <div className={styles.metaGrid}>
            <div className={styles.metaCard}>
              <span className={styles.metaLabel}>Issue Date</span>
              <span className={styles.metaValue}>{formatDate(invoice.issueDate)}</span>
            </div>
            <div className={styles.metaCard}>
              <span className={styles.metaLabel}>Due Date</span>
              <span className={styles.metaValue}>{formatDate(invoice.dueDate)}</span>
            </div>
          </div>

          {invoice.notes ? <p className={styles.notes}>{invoice.notes}</p> : null}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Line Items</h3>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.tableHead}>Product</th>
                  <th className={`${styles.tableHead} ${styles.tableHeadRight}`}>Unit Price</th>
                  <th className={`${styles.tableHead} ${styles.tableHeadRight}`}>Qty</th>
                  <th className={`${styles.tableHead} ${styles.tableHeadRight}`}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={`${invoice.id}-item-${index}`} className={styles.tableRow}>
                    <td className={styles.tableCell}>{item.productName}</td>
                    <td className={`${styles.tableCell} ${styles.tableCellRight}`}>
                      {formatMinorCurrency(item.unitPrice)}
                    </td>
                    <td className={`${styles.tableCell} ${styles.tableCellRight}`}>
                      {item.quantity}
                    </td>
                    <td className={`${styles.tableCell} ${styles.tableCellRight}`}>
                      {formatMinorCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Summary</h3>

          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Subtotal</span>
              <span className={styles.summaryValue}>{formatMinorCurrency(invoice.subtotal)}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{`Tax (${taxRateLabel}%)`}</span>
              <span className={styles.summaryValue}>{formatMinorCurrency(invoice.taxAmount)}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Total</span>
              <span className={styles.summaryValue}>{formatMinorCurrency(invoice.total)}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Items</span>
              <span className={styles.summaryValue}>{invoice.itemCount}</span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          {actionError ? <div className={styles.errorBanner}>{actionError}</div> : null}

          <div className={styles.actions}>
            {invoice.status === "DRAFT" ? (
              <>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={onEdit}
                  disabled={isUpdatingStatus}
                >
                  Edit Draft
                </button>
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={() => onStatusChange("ISSUED")}
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? "Updating..." : "Issue Invoice"}
                </button>
                <button
                  className={styles.dangerButton}
                  type="button"
                  onClick={() => onStatusChange("CANCELLED")}
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? "Updating..." : "Cancel Draft"}
                </button>
              </>
            ) : null}

            {invoice.status === "ISSUED" ? (
              <>
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={() => onStatusChange("PAID")}
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? "Updating..." : "Mark as Paid"}
                </button>
                <button
                  className={styles.dangerButton}
                  type="button"
                  onClick={() => onStatusChange("CANCELLED")}
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? "Updating..." : "Cancel Invoice"}
                </button>
              </>
            ) : null}

            <button className={styles.closeButton} type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </section>
      </section>
    </div>
  );
}
