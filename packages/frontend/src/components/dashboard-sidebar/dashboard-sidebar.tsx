"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./dashboard-sidebar.module.css";

const navigationItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Inventory", href: "/inventory" },
  { label: "Invoice", href: "/invoice" },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.badge}>StockFlow</span>
      </div>

      <nav className={styles.nav} aria-label="Main navigation">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.link}${isActive ? ` ${styles.linkActive}` : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
