import { InvoicePageContent } from "../../components/invoice-page/invoice-page";

function resolveTaxRateLabel() {
  const rawValue = (process.env.INVOICE_TAX_RATE_PERCENT ?? "11").trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(rawValue);

  if (!match) {
    return "11";
  }

  return match[2] ? `${match[1]}.${match[2]}` : match[1];
}

export default function InvoicePage() {
  return <InvoicePageContent taxRateLabel={resolveTaxRateLabel()} />;
}
