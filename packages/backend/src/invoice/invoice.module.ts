import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { Invoice, InvoiceSchema } from "../schemas/invoice.schema";
import { Product, ProductSchema } from "../schemas/product.schema";
import { InvoiceController } from "./invoice.controller";
import { InvoiceService } from "./invoice.service";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService],
})
export class InvoiceModule {}
