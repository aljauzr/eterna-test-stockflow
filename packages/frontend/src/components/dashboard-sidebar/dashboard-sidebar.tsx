"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "../../lib/api";
import { clearStoredAuthSession, getStoredAccessToken } from "../../lib/auth-storage";
import styles from "./dashboard-sidebar.module.css";

const navigationItems = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
  { label: "Inventory", href: "/inventory", icon: InventoryIcon },
  { label: "Invoice", href: "/invoice", icon: InvoiceIcon },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  function handleNavigate(href: string) {
    if (pendingHref || pathname === href) {
      return;
    }

    setPendingHref(href);

    requestAnimationFrame(() => {
      router.push(href);
    });
  }

  async function handleLogout() {
    const accessToken = getStoredAccessToken();
    setIsLoggingOut(true);

    try {
      if (accessToken) {
        await apiRequest("/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }
    } catch {
      // Clear the local session even if the backend token is already invalid.
    } finally {
      clearStoredAuthSession();
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.topSection}>
        <div className={styles.brand}>
          <span className={styles.badge}>StockFlow</span>
        </div>

        <nav className={styles.nav} aria-label="Main navigation">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <button
                key={item.href}
                type="button"
                className={`${styles.link}${isActive ? ` ${styles.linkActive}` : ""}`}
                onClick={() => handleNavigate(item.href)}
                disabled={pendingHref !== null || isLoggingOut}
              >
                <span className={styles.linkContent}>
                  <Icon className={styles.linkIcon} />
                  <span>{item.label}</span>
                </span>
                {pendingHref === item.href ? <span className={styles.spinner} aria-label="Loading" /> : null}
              </button>
            );
          })}
        </nav>
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.logoutButton}
          onClick={() => void handleLogout()}
          disabled={isLoggingOut || pendingHref !== null}
        >
          <span className={styles.linkContent}>
            <LogoutIcon className={styles.linkIcon} />
            <span>{isLoggingOut ? "Signing Out..." : "Logout"}</span>
          </span>
          {isLoggingOut ? <span className={styles.spinner} aria-label="Signing out" /> : null}
        </button>
      </div>
    </aside>
  );
}

type IconProps = {
  className?: string;
};

function DashboardIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12.75L12 4l8 8.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 10.5V20h9v-9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InventoryIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.75 7.75h14.5v10.5H4.75z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 7.75V5.75h8v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function InvoiceIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4.75h8l3.25 3.25V19.25H7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M15 4.75V8h3.25" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9.5 11h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.5 14.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 6.75H6.75v10.5H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 8.5l3.75 3.5L13 15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.5 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
