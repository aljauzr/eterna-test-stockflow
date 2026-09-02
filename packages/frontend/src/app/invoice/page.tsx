import { DashboardShell } from "../../components/dashboard-shell/dashboard-shell";

export default function InvoicePage() {
  return (
    <DashboardShell>
      <main className="workspace-page">
        <section className="workspace-card">
          <span className="workspace-card__eyebrow">Invoice</span>
          <h1 className="workspace-card__title">Invoice page is ready for the next step</h1>
          <p className="workspace-card__description">
            This placeholder page will become the invoicing workflow. Navigation is already
            connected from the dashboard and sidebar.
          </p>
        </section>
      </main>
    </DashboardShell>
  );
}
