import { SessionPanel } from "./session-panel";

const productRows = [
  { sku: "SKU-001", name: "Demo Product A", stock: 18, price: "Rp120.000" },
  { sku: "SKU-002", name: "Demo Product B", stock: 6, price: "Rp85.000" },
  { sku: "SKU-003", name: "Demo Product C", stock: 32, price: "Rp45.000" },
];

export function DashboardHome() {
  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "40px 24px 64px",
      }}
    >
      <section
        style={{
          display: "grid",
          gap: "24px",
          gridTemplateColumns: "1.4fr 1fr",
          alignItems: "start",
        }}
      >
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "20px",
            padding: "32px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "var(--primary)",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            StockFlow
          </p>
          <h1 style={{ margin: "12px 0 16px", fontSize: "40px", lineHeight: 1.1 }}>
            Starter dashboard for inventory and invoicing
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "16px", lineHeight: 1.7 }}>
            This dashboard is only available after a successful authentication flow.
            Products and invoices are still placeholder data for the next implementation
            steps.
          </p>
          <div style={{ display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap" }}>
            <button
              style={{
                background: "var(--primary)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                padding: "12px 18px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Add Product
            </button>
            <button
              style={{
                background: "var(--primary-soft)",
                color: "var(--primary)",
                border: "1px solid #c7d7fe",
                borderRadius: "12px",
                padding: "12px 18px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Create Invoice
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "16px",
          }}
        >
          {[
            { label: "Total Products", value: "24" },
            { label: "Draft Invoices", value: "7" },
            { label: "Inventory Value", value: "Rp18.450.000" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: "18px",
                padding: "20px",
              }}
            >
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "14px" }}>{item.label}</p>
              <p style={{ margin: "8px 0 0", fontSize: "28px", fontWeight: 700 }}>{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <SessionPanel />

      <section
        style={{
          marginTop: "24px",
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: "20px",
          padding: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "24px" }}>Saved Products</h2>
            <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
              Preview of the product list for the initial dashboard view.
            </p>
          </div>
          <input
            aria-label="Search products"
            placeholder="Search by SKU or product name"
            style={{
              width: "320px",
              maxWidth: "100%",
              padding: "12px 14px",
              borderRadius: "12px",
              border: "1px solid var(--line)",
              fontSize: "14px",
            }}
          />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                <th style={{ padding: "12px 0" }}>SKU</th>
                <th style={{ padding: "12px 0" }}>Name</th>
                <th style={{ padding: "12px 0" }}>Stock</th>
                <th style={{ padding: "12px 0" }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {productRows.map((product) => (
                <tr key={product.sku} style={{ borderTop: "1px solid #eaecf0" }}>
                  <td style={{ padding: "16px 0" }}>{product.sku}</td>
                  <td style={{ padding: "16px 0" }}>{product.name}</td>
                  <td style={{ padding: "16px 0" }}>{product.stock}</td>
                  <td style={{ padding: "16px 0" }}>{product.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
