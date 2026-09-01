import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { User } from "./user.schema";

export type ProductDocument = HydratedDocument<Product>;

@Schema({ collection: "products", timestamps: true })
export class Product {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  sku!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ default: "" })
  description!: string;

  @Prop({ required: true, min: 0 })
  unitPrice!: number;

  @Prop({ required: true, min: 0 })
  quantityOnHand!: number;
}
export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ ownerId: 1, sku: 1 }, { unique: true });
