import { DashboardShell } from "../../components/dashboard-shell/dashboard-shell";

export default function InventoryPage() {
  return (
    <DashboardShell>
      <main className="workspace-page">
        <section className="workspace-card">
          <span className="workspace-card__eyebrow">Inventory</span>
          <h1 className="workspace-card__title">Inventory page is ready for the next step</h1>
          <p className="workspace-card__description">
            This placeholder page will become the products management area. The sidebar and
            route structure are already in place.
          </p>
        </section>
      </main>
    </DashboardShell>
  );
}
