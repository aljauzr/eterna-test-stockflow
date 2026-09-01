import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { Product } from "./product.schema";
import { User } from "./user.schema";

export type InvoiceDocument = HydratedDocument<Invoice>;

@Schema({ _id: false })
export class InvoiceItem {
  @Prop({ type: Types.ObjectId, ref: Product.name, required: true })
  productId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  productName!: string;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({ required: true, min: 0 })
  unitPrice!: number;

  @Prop({ required: true, min: 0 })
  lineTotal!: number;
}

export const InvoiceItemSchema = SchemaFactory.createForClass(InvoiceItem);

@Schema({ collection: "invoices", timestamps: true })
export class Invoice {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  invoiceNumber!: string;

  @Prop({ required: true, trim: true })
  customerName!: string;

  @Prop({ required: true, enum: ["DRAFT", "ISSUED", "PAID", "CANCELLED"], default: "DRAFT" })
  status!: "DRAFT" | "ISSUED" | "PAID" | "CANCELLED";

  @Prop({ type: [InvoiceItemSchema], default: [] })
  items!: InvoiceItem[];

  @Prop({ required: true, min: 0 })
  subtotal!: number;

  @Prop({ required: true, min: 0 })
  taxAmount!: number;

  @Prop({ required: true, min: 0 })
  total!: number;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ ownerId: 1, invoiceNumber: 1 }, { unique: true });
