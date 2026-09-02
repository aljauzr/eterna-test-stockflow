import { ReactNode } from "react";
import { DashboardSidebar } from "../dashboard-sidebar/dashboard-sidebar";
import styles from "./dashboard-shell.module.css";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className={styles.shell}>
      <DashboardSidebar />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
