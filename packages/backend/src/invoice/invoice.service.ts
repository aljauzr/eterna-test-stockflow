import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { request } from "node:http";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, Types } from "mongoose";
import {
  Invoice,
  InvoiceDocument,
  InvoiceItem,
  InvoiceStatus,
} from "../schemas/invoice.schema";
import { Product, ProductDocument } from "../schemas/product.schema";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { InvoiceItemInputDto } from "./dto/invoice-item-input.dto";
import { ListInvoicesQueryDto } from "./dto/list-invoices-query.dto";
import { UpdateInvoiceStatusDto } from "./dto/update-invoice-status.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";

type InvoiceObject = Invoice & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

type InvoiceDraftCalculation = {
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
};

const DEFAULT_TAX_RATE_PERCENT = "11";
const MAX_INVOICE_NUMBER_RETRIES = 5;

@Injectable()
export class InvoiceService {
  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(userId: string, createInvoiceDto: CreateInvoiceDto) {
    const { issueDate, dueDate } = this.validateInvoiceDates(
      createInvoiceDto.issueDate,
      createInvoiceDto.dueDate,
    );
    const draft = await this.buildInvoiceDraft(userId, createInvoiceDto.items);

    for (let attempt = 0; attempt < MAX_INVOICE_NUMBER_RETRIES; attempt += 1) {
      const invoiceNumber = await this.generateInvoiceNumber(issueDate);

      try {
        const invoice = await this.invoiceModel.create({
          ownerId: new Types.ObjectId(userId),
          invoiceNumber,
          customerName: createInvoiceDto.customerName,
          issueDate,
          dueDate,
          status: "DRAFT",
          notes: createInvoiceDto.notes ?? "",
          items: draft.items,
          subtotal: draft.subtotal,
          taxAmount: draft.taxAmount,
          total: draft.total,
        });

        return {
          success: true,
          data: this.toInvoiceResponse(invoice),
        };
      } catch (error) {
        if (this.isDuplicateInvoiceNumberError(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException("Unable to generate a unique invoice number. Please try again.");
  }

  async list(userId: string, query: ListInvoicesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 8;

    const filters: FilterQuery<InvoiceDocument> = {
      ownerId: new Types.ObjectId(userId),
    };

    if (query.status) {
      filters.status = query.status;
    }

    const totalItems = await this.invoiceModel.countDocuments(filters);
    const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / limit);
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const invoices = await this.invoiceModel
      .find(filters)
      .sort({ updatedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit);

    return {
      success: true,
      data: {
        items: invoices.map((invoice) => this.toInvoiceSummaryResponse(invoice)),
        pagination: {
          page: safePage,
          limit,
          totalItems,
          totalPages,
          hasNextPage: safePage < totalPages,
          hasPreviousPage: safePage > 1,
        },
        filters: {
          status: query.status ?? "",
        },
      },
    };
  }

  async getOne(userId: string, invoiceId: string) {
    const invoice = await this.findOwnedInvoiceOrFail(userId, invoiceId);

    return {
      success: true,
      data: this.toInvoiceResponse(invoice),
    };
  }

  async update(userId: string, invoiceId: string, updateInvoiceDto: UpdateInvoiceDto) {
    const invoice = await this.findOwnedInvoiceOrFail(userId, invoiceId);

    if (invoice.status !== "DRAFT") {
      throw new ConflictException("Only draft invoices can be edited.");
    }

    let nextIssueDate = invoice.issueDate;
    let nextDueDate = invoice.dueDate;

    if (updateInvoiceDto.issueDate || updateInvoiceDto.dueDate) {
      const validatedDates = this.validateInvoiceDates(
        updateInvoiceDto.issueDate ?? invoice.issueDate.toISOString(),
        updateInvoiceDto.dueDate ?? invoice.dueDate.toISOString(),
      );

      nextIssueDate = validatedDates.issueDate;
      nextDueDate = validatedDates.dueDate;
    }

    if (updateInvoiceDto.items) {
      const draft = await this.buildInvoiceDraft(userId, updateInvoiceDto.items);
      invoice.items = draft.items;
      invoice.subtotal = draft.subtotal;
      invoice.taxAmount = draft.taxAmount;
      invoice.total = draft.total;
    }

    invoice.customerName = updateInvoiceDto.customerName ?? invoice.customerName;
    invoice.issueDate = nextIssueDate;
    invoice.dueDate = nextDueDate;
    invoice.notes = updateInvoiceDto.notes ?? invoice.notes;

    await invoice.save();

    return {
      success: true,
      data: this.toInvoiceResponse(invoice),
    };
  }

  async updateStatus(userId: string, invoiceId: string, updateInvoiceStatusDto: UpdateInvoiceStatusDto) {
    const invoice = await this.findOwnedInvoiceOrFail(userId, invoiceId);
    // #region debug-point A:update-status-entry
    this.reportDebugEvent("A", "invoice.service.ts:updateStatus", {
      invoiceId,
      userId,
      currentStatus: invoice.status,
      nextStatus: updateInvoiceStatusDto.status,
      itemCount: invoice.items.length,
    });
    // #endregion

    if (invoice.status === updateInvoiceStatusDto.status) {
      return {
        success: true,
        data: this.toInvoiceResponse(invoice),
      };
    }

    this.ensureTransitionIsAllowed(invoice.status, updateInvoiceStatusDto.status);

    if (updateInvoiceStatusDto.status === "ISSUED") {
      return this.issueInvoice(userId, invoiceId);
    }

    if (updateInvoiceStatusDto.status === "PAID") {
      return this.markInvoiceAsPaid(userId, invoiceId);
    }

    if (updateInvoiceStatusDto.status === "CANCELLED") {
      return this.cancelInvoice(userId, invoiceId);
    }

    throw new ConflictException("This status transition is not allowed.");
  }

  private async issueInvoice(userId: string, invoiceId: string) {
    const invoice = await this.findOwnedInvoiceOrFail(userId, invoiceId);
    // #region debug-point B:issue-start
    this.reportDebugEvent("B", "invoice.service.ts:issueInvoice:start", {
      invoiceId,
      userId,
      currentStatus: invoice.status,
      items: invoice.items.map((item) => ({
        productId: item.productId.toString(),
        quantity: item.quantity,
      })),
    });
    // #endregion

    if (invoice.status !== "DRAFT") {
      throw new ConflictException("Only draft invoices can be issued.");
    }

    const ownerObjectId = new Types.ObjectId(userId);
    const invoiceProductIds = invoice.items.map((item) => item.productId);
    const products = await this.productModel.find({
      _id: { $in: invoiceProductIds },
      ownerId: ownerObjectId,
    });
    const productById = new Map(products.map((product) => [product.id, product]));
    // #region debug-point C:issue-products-loaded
    this.reportDebugEvent("C", "invoice.service.ts:issueInvoice:productsLoaded", {
      invoiceId,
      requestedProductIds: invoiceProductIds.map((productId) => productId.toString()),
      loadedProducts: products.map((product) => ({
        id: product.id,
        quantityOnHand: product.quantityOnHand,
      })),
    });
    // #endregion

    for (const item of invoice.items) {
      const product = productById.get(item.productId.toString());

      if (!product) {
        throw new UnprocessableEntityException({
          message: "Validation failed",
          errors: {
            items: [`Product "${item.productName}" is no longer available.`],
          },
        });
      }

      if (item.quantity > product.quantityOnHand) {
        throw new UnprocessableEntityException({
          message: "Validation failed",
          errors: {
            items: [
              `Quantity for ${product.name} exceeds the available stock (${product.quantityOnHand}).`,
            ],
          },
        });
      }
    }

    const bulkOperations = invoice.items.map((item) => ({
      updateOne: {
        filter: {
          _id: item.productId,
          ownerId: ownerObjectId,
          quantityOnHand: { $gte: item.quantity },
        },
        update: { $inc: { quantityOnHand: -item.quantity } },
      },
    }));

    const stockUpdateResult = await this.productModel.bulkWrite(bulkOperations);
    // #region debug-point A:issue-bulk-write-result
    this.reportDebugEvent("A", "invoice.service.ts:issueInvoice:bulkWrite", {
      invoiceId,
      matchedCount: stockUpdateResult.matchedCount,
      modifiedCount: stockUpdateResult.modifiedCount,
      operationCount: bulkOperations.length,
    });
    // #endregion

    if (stockUpdateResult.modifiedCount !== invoice.items.length) {
      throw new UnprocessableEntityException({
        message: "Validation failed",
        errors: {
          items: ["One or more invoice lines exceed the available stock."],
        },
      });
    }

    try {
      invoice.status = "ISSUED";
      await invoice.save();
      // #region debug-point E:issue-save-success
      this.reportDebugEvent("E", "invoice.service.ts:issueInvoice:saveSuccess", {
        invoiceId,
        persistedStatus: invoice.status,
      });
      // #endregion
    } catch (error) {
      // #region debug-point E:issue-save-error
      this.reportDebugEvent("E", "invoice.service.ts:issueInvoice:saveError", {
        invoiceId,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      // #endregion
      await this.productModel.bulkWrite(
        invoice.items.map((item) => ({
          updateOne: {
            filter: {
              _id: item.productId,
              ownerId: ownerObjectId,
            },
            update: { $inc: { quantityOnHand: item.quantity } },
          },
        })),
      );
      throw error;
    }

    return {
      success: true,
      data: this.toInvoiceResponse(invoice),
    };
  }

  private async markInvoiceAsPaid(userId: string, invoiceId: string) {
    const invoice = await this.findOwnedInvoiceOrFail(userId, invoiceId);

    if (invoice.status !== "ISSUED") {
      throw new ConflictException("Only issued invoices can be marked as paid.");
    }

    invoice.status = "PAID";
    await invoice.save();

    return {
      success: true,
      data: this.toInvoiceResponse(invoice),
    };
  }

  private async cancelInvoice(userId: string, invoiceId: string) {
    const invoice = await this.findOwnedInvoiceOrFail(userId, invoiceId);
    // #region debug-point B:cancel-start
    this.reportDebugEvent("B", "invoice.service.ts:cancelInvoice:start", {
      invoiceId,
      userId,
      currentStatus: invoice.status,
      items: invoice.items.map((item) => ({
        productId: item.productId.toString(),
        quantity: item.quantity,
      })),
    });
    // #endregion

    if (invoice.status === "DRAFT") {
      invoice.status = "CANCELLED";
      await invoice.save();
      // #region debug-point E:cancel-draft-save-success
      this.reportDebugEvent("E", "invoice.service.ts:cancelInvoice:draftSaveSuccess", {
        invoiceId,
        persistedStatus: invoice.status,
      });
      // #endregion

      return {
        success: true,
        data: this.toInvoiceResponse(invoice),
      };
    }

    if (invoice.status !== "ISSUED") {
      throw new ConflictException("Only draft or issued invoices can be cancelled.");
    }

    const ownerObjectId = new Types.ObjectId(userId);
    const stockRestoreResult = await this.productModel.bulkWrite(
      invoice.items.map((item) => ({
        updateOne: {
          filter: {
            _id: item.productId,
            ownerId: ownerObjectId,
          },
          update: { $inc: { quantityOnHand: item.quantity } },
        },
      })),
    );
    // #region debug-point A:cancel-bulk-write-result
    this.reportDebugEvent("A", "invoice.service.ts:cancelInvoice:bulkWrite", {
      invoiceId,
      matchedCount: stockRestoreResult.matchedCount,
      modifiedCount: stockRestoreResult.modifiedCount,
      operationCount: invoice.items.length,
    });
    // #endregion

    try {
      invoice.status = "CANCELLED";
      await invoice.save();
      // #region debug-point E:cancel-save-success
      this.reportDebugEvent("E", "invoice.service.ts:cancelInvoice:saveSuccess", {
        invoiceId,
        persistedStatus: invoice.status,
      });
      // #endregion
    } catch (error) {
      // #region debug-point E:cancel-save-error
      this.reportDebugEvent("E", "invoice.service.ts:cancelInvoice:saveError", {
        invoiceId,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      // #endregion
      await this.productModel.bulkWrite(
        invoice.items.map((item) => ({
          updateOne: {
            filter: {
              _id: item.productId,
              ownerId: ownerObjectId,
            },
            update: { $inc: { quantityOnHand: -item.quantity } },
          },
        })),
      );
      throw error;
    }

    return {
      success: true,
      data: this.toInvoiceResponse(invoice),
    };
  }

  private async buildInvoiceDraft(userId: string, items: InvoiceItemInputDto[]): Promise<InvoiceDraftCalculation> {
    const ownerObjectId = new Types.ObjectId(userId);
    const duplicateProductIds = new Set<string>();
    const seenProductIds = new Set<string>();

    for (const item of items) {
      if (seenProductIds.has(item.productId)) {
        duplicateProductIds.add(item.productId);
      }

      seenProductIds.add(item.productId);
    }

    if (duplicateProductIds.size > 0) {
      throw new UnprocessableEntityException({
        message: "Validation failed",
        errors: {
          items: ["Each product can appear only once in an invoice."],
        },
      });
    }

    const products = await this.productModel.find({
      _id: { $in: items.map((item) => item.productId) },
      ownerId: ownerObjectId,
    });

    const productById = new Map(products.map((product) => [product.id, product]));

    const invoiceItems: InvoiceItem[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = productById.get(item.productId);
      if (!product) {
        throw new UnprocessableEntityException({
          message: "Validation failed",
          errors: {
            items: ["One or more selected products could not be found."],
          },
        });
      }

      if (item.quantity > product.quantityOnHand) {
        throw new UnprocessableEntityException({
          message: "Validation failed",
          errors: {
            items: [
              `Quantity for ${product.name} exceeds the available stock (${product.quantityOnHand}).`,
            ],
          },
        });
      }

      const unitPrice = this.toMinorUnits(product.unitPrice);
      const lineTotal = unitPrice * item.quantity;

      invoiceItems.push({
        productId: product._id,
        productName: product.name,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
      });
      subtotal += lineTotal;
    }

    const taxAmount = this.calculateTaxAmount(subtotal);

    return {
      items: invoiceItems,
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
  }

  private validateInvoiceDates(issueDateRaw: string, dueDateRaw: string) {
    const issueDate = new Date(issueDateRaw);
    const dueDate = new Date(dueDateRaw);

    if (Number.isNaN(issueDate.getTime()) || Number.isNaN(dueDate.getTime())) {
      throw new BadRequestException("Invalid invoice dates");
    }

    if (dueDate.getTime() < issueDate.getTime()) {
      throw new UnprocessableEntityException({
        message: "Validation failed",
        errors: {
          dueDate: ["Due date must be the same as or later than the issue date."],
        },
      });
    }

    return { issueDate, dueDate };
  }

  private calculateTaxAmount(subtotalMinor: number) {
    const basisPoints = this.getTaxRateBasisPoints();
    return Math.round((subtotalMinor * basisPoints) / 10000);
  }

  private getTaxRateBasisPoints() {
    const rawValue = (process.env.INVOICE_TAX_RATE_PERCENT ?? DEFAULT_TAX_RATE_PERCENT).trim();
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(rawValue);

    if (!match) {
      return 1100;
    }

    const integerPart = Number(match[1]) * 100;
    const decimalPart = Number((match[2] ?? "").padEnd(2, "0") || "0");
    return integerPart + decimalPart;
  }

  private toMinorUnits(value: number) {
    return Math.round(value * 100);
  }

  private ensureTransitionIsAllowed(currentStatus: InvoiceStatus, nextStatus: InvoiceStatus) {
    const allowedTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      DRAFT: ["ISSUED", "CANCELLED"],
      ISSUED: ["PAID", "CANCELLED"],
      PAID: [],
      CANCELLED: [],
    };

    if (!allowedTransitions[currentStatus].includes(nextStatus)) {
      throw new ConflictException(
        `Status transition from ${currentStatus} to ${nextStatus} is not allowed.`,
      );
    }
  }

  private async generateInvoiceNumber(issueDate: Date) {
    const year = issueDate.getUTCFullYear();
    const latestInvoice = await this.invoiceModel
      .findOne({
        invoiceNumber: { $regex: `^INV-${year}-\\d{4}$` },
      })
      .sort({ invoiceNumber: -1 })
      .select({ invoiceNumber: 1 });

    const invoiceNumberParts = latestInvoice?.invoiceNumber.split("-") ?? [];
    const latestSequence = invoiceNumberParts.length > 0
      ? Number(invoiceNumberParts[invoiceNumberParts.length - 1] ?? "0")
      : 0;

    return `INV-${year}-${String(latestSequence + 1).padStart(4, "0")}`;
  }

  private isDuplicateInvoiceNumberError(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
  }

  private async findOwnedInvoiceOrFail(
    userId: string,
    invoiceId: string,
  ) {
    if (!Types.ObjectId.isValid(invoiceId)) {
      throw new BadRequestException("Invalid invoice id");
    }

    const invoice = await this.invoiceModel.findOne({
      _id: invoiceId,
      ownerId: new Types.ObjectId(userId),
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    return invoice;
  }

  private reportDebugEvent(
    hypothesisId: string,
    msg: string,
    data: Record<string, unknown>,
  ) {
    try {
      const body = JSON.stringify({
        sessionId: "invoice-status-500",
        runId: "pre-fix",
        hypothesisId,
        location: "packages/backend/src/invoice/invoice.service.ts",
        msg: `[DEBUG] ${msg}`,
        data,
        ts: Date.now(),
      });
      const req = request(
        {
          method: "POST",
          hostname: "127.0.0.1",
          port: 7777,
          path: "/event",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
        },
        (response) => {
          response.resume();
        },
      );
      req.on("error", () => undefined);
      req.write(body);
      req.end();
    } catch {
      // Debug reporting must never affect invoice behavior.
    }
  }

  private toInvoiceSummaryResponse(invoice: InvoiceDocument) {
    const source = invoice.toObject() as InvoiceObject;

    return {
      id: source._id.toString(),
      invoiceNumber: source.invoiceNumber,
      customerName: source.customerName,
      issueDate: source.issueDate.toISOString(),
      dueDate: source.dueDate.toISOString(),
      status: source.status,
      notes: source.notes,
      subtotal: source.subtotal,
      taxAmount: source.taxAmount,
      total: source.total,
      itemCount: source.items.length,
      createdAt: source.createdAt?.toISOString() ?? null,
      updatedAt: source.updatedAt?.toISOString() ?? null,
    };
  }

  private toInvoiceResponse(invoice: InvoiceDocument) {
    const source = invoice.toObject() as InvoiceObject;

    return {
      ...this.toInvoiceSummaryResponse(invoice),
      items: source.items.map((item) => ({
        productId: item.productId.toString(),
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
    };
  }
}
