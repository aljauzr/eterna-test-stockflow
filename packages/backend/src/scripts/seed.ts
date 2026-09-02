import * as bcrypt from "bcryptjs";
import * as fs from "node:fs";
import * as path from "node:path";
import mongoose, { Types } from "mongoose";

type SeedProduct = {
  key: string;
  sku: string;
  name: string;
  description: string;
  unitPrice: number;
  quantityOnHand: number;
};

type SeedInvoiceItem = {
  productKey: string;
  quantity: number;
};

type SeedInvoice = {
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "CANCELLED";
  items: SeedInvoiceItem[];
};

type EnvMap = Record<string, string>;

const DEMO_USER = {
  email: "reviewer@stockflow.local",
  password: "Stockflow123!",
  workspaceName: "reviewer-stockflow-local",
};

const PRODUCT_SEEDS: SeedProduct[] = [
  {
    key: "coffeeBeans",
    sku: "COF-001",
    name: "Arabica Beans",
    description: "Main coffee bean stock for espresso drinks.",
    unitPrice: 12.5,
    quantityOnHand: 18,
  },
  {
    key: "paperCups",
    sku: "CUP-001",
    name: "Paper Cups",
    description: "12 oz takeaway cups.",
    unitPrice: 0.35,
    quantityOnHand: 120,
  },
  {
    key: "oatMilk",
    sku: "OAT-001",
    name: "Oat Milk",
    description: "Barista oat milk cartons.",
    unitPrice: 4.75,
    quantityOnHand: 9,
  },
  {
    key: "vanillaSyrup",
    sku: "SYR-001",
    name: "Vanilla Syrup",
    description: "Sweet syrup for flavored drinks.",
    unitPrice: 6.25,
    quantityOnHand: 4,
  },
  {
    key: "greenTea",
    sku: "TEA-001",
    name: "Green Tea",
    description: "Loose leaf green tea boxes.",
    unitPrice: 3.2,
    quantityOnHand: 40,
  },
  {
    key: "butterCookies",
    sku: "CKI-001",
    name: "Butter Cookies",
    description: "Retail cookie packs for add-on sales.",
    unitPrice: 5.5,
    quantityOnHand: 24,
  },
  {
    key: "honeySachets",
    sku: "HNY-001",
    name: "Honey Sachets",
    description: "Single-serve honey sachets.",
    unitPrice: 0.15,
    quantityOnHand: 200,
  },
  {
    key: "cocoaPowder",
    sku: "COC-001",
    name: "Cocoa Powder",
    description: "Chocolate powder for mocha drinks.",
    unitPrice: 8.4,
    quantityOnHand: 15,
  },
  {
    key: "lemonSlices",
    sku: "LEM-001",
    name: "Lemon Slices",
    description: "Frozen lemon slices for tea.",
    unitPrice: 1.1,
    quantityOnHand: 25,
  },
];

const INVOICE_SEEDS: SeedInvoice[] = [
  {
    invoiceNumber: "INV-2026-0001",
    customerName: "Northwind Cafe",
    issueDate: "2026-09-03T00:00:00.000Z",
    dueDate: "2026-09-10T00:00:00.000Z",
    notes: "Draft invoice ready to issue.",
    status: "DRAFT",
    items: [
      { productKey: "coffeeBeans", quantity: 2 },
      { productKey: "paperCups", quantity: 10 },
    ],
  },
  {
    invoiceNumber: "INV-2026-0002",
    customerName: "Atlas Bistro",
    issueDate: "2026-09-04T00:00:00.000Z",
    dueDate: "2026-09-11T00:00:00.000Z",
    notes: "Uses the same coffee stock as another draft for issue-testing.",
    status: "DRAFT",
    items: [{ productKey: "coffeeBeans", quantity: 17 }],
  },
  {
    invoiceNumber: "INV-2026-0003",
    customerName: "Morning Brew",
    issueDate: "2026-09-01T00:00:00.000Z",
    dueDate: "2026-09-08T00:00:00.000Z",
    notes: "Issued invoice that already reduced stock.",
    status: "ISSUED",
    items: [
      { productKey: "oatMilk", quantity: 3 },
      { productKey: "lemonSlices", quantity: 5 },
    ],
  },
  {
    invoiceNumber: "INV-2026-0004",
    customerName: "Blue Harbor Hotel",
    issueDate: "2026-08-28T00:00:00.000Z",
    dueDate: "2026-09-04T00:00:00.000Z",
    notes: "Paid invoice for completed settlement flow.",
    status: "PAID",
    items: [{ productKey: "vanillaSyrup", quantity: 2 }],
  },
  {
    invoiceNumber: "INV-2026-0005",
    customerName: "Cookie Corner",
    issueDate: "2026-08-20T00:00:00.000Z",
    dueDate: "2026-08-27T00:00:00.000Z",
    notes: "Cancelled invoice showing restored stock while preserving references.",
    status: "CANCELLED",
    items: [{ productKey: "butterCookies", quantity: 4 }],
  },
  {
    invoiceNumber: "INV-2026-0006",
    customerName: "Riverbank Office",
    issueDate: "2026-09-05T00:00:00.000Z",
    dueDate: "2026-09-12T00:00:00.000Z",
    notes: "Draft invoice with a single lightweight consumable line.",
    status: "DRAFT",
    items: [{ productKey: "honeySachets", quantity: 30 }],
  },
  {
    invoiceNumber: "INV-2026-0007",
    customerName: "Sunset Deli",
    issueDate: "2026-08-18T00:00:00.000Z",
    dueDate: "2026-08-25T00:00:00.000Z",
    notes: "Cancelled invoice that still blocks product deletion.",
    status: "CANCELLED",
    items: [{ productKey: "paperCups", quantity: 24 }],
  },
];

async function main() {
  loadRootEnv();

  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required to run the seed script.");
  }

  await mongoose.connect(mongoUri);

  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("MongoDB connection is established but no database handle is available.");
    }

    const users = db.collection("users");
    const products = db.collection("products");
    const invoices = db.collection("invoices");

    const now = new Date();
    const passwordHash = await bcrypt.hash(DEMO_USER.password, 12);

    await users.updateOne(
      { email: DEMO_USER.email.toLowerCase() },
      {
        $set: {
          email: DEMO_USER.email.toLowerCase(),
          passwordHash,
          workspaceName: DEMO_USER.workspaceName,
          tokenVersion: 0,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    const demoUser = await users.findOne(
      { email: DEMO_USER.email.toLowerCase() },
      { projection: { _id: 1 } },
    );

    if (!demoUser?._id) {
      throw new Error("Failed to create or load the demo user.");
    }

    const ownerId = new Types.ObjectId(String(demoUser._id));

    await invoices.deleteMany({
      $or: [
        { ownerId },
        { invoiceNumber: { $in: INVOICE_SEEDS.map((invoice) => invoice.invoiceNumber) } },
      ],
    });
    await products.deleteMany({ ownerId });

    const productIdByKey = new Map<string, Types.ObjectId>();
    const productDocs = PRODUCT_SEEDS.map((product, index) => {
      const productId = new Types.ObjectId();
      productIdByKey.set(product.key, productId);

      return {
        _id: productId,
        ownerId,
        sku: product.sku,
        name: product.name,
        description: product.description,
        unitPrice: product.unitPrice,
        quantityOnHand: product.quantityOnHand,
        createdAt: offsetDate(now, -(index + 1)),
        updatedAt: offsetDate(now, -(index + 1)),
      };
    });

    await products.insertMany(productDocs);

    const taxBasisPoints = getTaxRateBasisPoints(process.env.INVOICE_TAX_RATE_PERCENT ?? "11");
    const invoiceDocs = INVOICE_SEEDS.map((invoice, index) => {
      const items = invoice.items.map((item) => {
        const product = PRODUCT_SEEDS.find((productSeed) => productSeed.key === item.productKey);
        const productId = productIdByKey.get(item.productKey);

        if (!product || !productId) {
          throw new Error(`Missing seeded product for key "${item.productKey}".`);
        }

        const unitPrice = toMinorUnits(product.unitPrice);
        const lineTotal = unitPrice * item.quantity;

        return {
          productId,
          productName: product.name,
          quantity: item.quantity,
          unitPrice,
          lineTotal,
        };
      });

      const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);
      const taxAmount = Math.round((subtotal * taxBasisPoints) / 10000);

      return {
        _id: new Types.ObjectId(),
        ownerId,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        issueDate: new Date(invoice.issueDate),
        dueDate: new Date(invoice.dueDate),
        notes: invoice.notes,
        status: invoice.status,
        items,
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
        createdAt: offsetDate(now, -(index + 2)),
        updatedAt: offsetDate(now, -(index + 1)),
      };
    });

    await invoices.insertMany(invoiceDocs);

    process.stdout.write(
      [
        "Seed completed successfully.",
        `Demo email: ${DEMO_USER.email}`,
        `Demo password: ${DEMO_USER.password}`,
        `Products seeded: ${PRODUCT_SEEDS.length}`,
        `Invoices seeded: ${INVOICE_SEEDS.length}`,
      ].join("\n") + "\n",
    );
  } finally {
    await mongoose.disconnect();
  }
}

function loadRootEnv() {
  const repoRoot = path.resolve(__dirname, "../../../../");
  const envCandidates = [
    path.join(repoRoot, ".env"),
    path.join(repoRoot, ".env.example"),
  ];

  for (const envPath of envCandidates) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const envContent = fs.readFileSync(envPath, "utf8");
    applyEnvFile(envContent);
  }
}

function applyEnvFile(envContent: string) {
  const envValues = envContent
    .split(/\r?\n/)
    .reduce<EnvMap>((accumulator, line) => {
      const normalizedLine = line.trim();
      if (!normalizedLine || normalizedLine.startsWith("#")) {
        return accumulator;
      }

      const separatorIndex = normalizedLine.indexOf("=");
      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = normalizedLine.slice(0, separatorIndex).trim();
      const value = normalizedLine.slice(separatorIndex + 1).trim();

      accumulator[key] = value;
      return accumulator;
    }, {});

  for (const [key, value] of Object.entries(envValues)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function getTaxRateBasisPoints(value: string) {
  const normalizedValue = value.trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalizedValue);

  if (!match) {
    return 1100;
  }

  const integerPart = Number(match[1]) * 100;
  const decimalPart = Number((match[2] ?? "").padEnd(2, "0") || "0");
  return integerPart + decimalPart;
}

function toMinorUnits(value: number) {
  return Math.round(value * 100);
}

function offsetDate(source: Date, days: number) {
  const nextDate = new Date(source);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
