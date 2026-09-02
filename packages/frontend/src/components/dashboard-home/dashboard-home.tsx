"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardShell } from "../dashboard-shell/dashboard-shell";
import styles from "./dashboard-home.module.css";

export function DashboardHome() {
  const router = useRouter();
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [isPageReady, setIsPageReady] = useState(false);

  useEffect(() => {
    setIsPageReady(true);
  }, []);

  function handleNavigate(href: string) {
    if (pendingRoute) {
      return;
    }

    setPendingRoute(href);

    requestAnimationFrame(() => {
      router.push(href);
    });
  }

  return (
    <DashboardShell>
      <main className={styles.main}>
        <section className={styles.section}>
          {!isPageReady ? (
            <div className={styles.card}>
              <span className={`${styles.skeletonBlock} ${styles.skeletonEyebrow}`} />
              <span className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
              <span className={`${styles.skeletonBlock} ${styles.skeletonTitleShort}`} />
              <div className={styles.actions}>
                <span className={`${styles.skeletonBlock} ${styles.skeletonButton}`} />
                <span className={`${styles.skeletonBlock} ${styles.skeletonButton}`} />
              </div>
            </div>
          ) : (
            <div className={styles.card}>
              <p className={styles.eyebrow}>StockFlow</p>
              <h1 className={styles.title}>Dashboard for inventory and invoicing</h1>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryAction}
                  onClick={() => handleNavigate("/inventory?drawer=create")}
                  disabled={pendingRoute !== null}
                >
                  {pendingRoute === "/inventory?drawer=create" ? <span className={styles.spinner} aria-label="Loading" /> : "Add Product"}
                </button>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => handleNavigate("/invoice?drawer=create")}
                  disabled={pendingRoute !== null}
                >
                  {pendingRoute === "/invoice?drawer=create" ? <span className={styles.spinnerSecondary} aria-label="Loading" /> : "Create Invoice"}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </DashboardShell>
  );
}
