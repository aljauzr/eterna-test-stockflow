import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import appConfig from "./config/app.config";
import { HealthController } from "./health/health.controller";
import { Product, ProductSchema } from "./schemas/product.schema";
import { User, UserSchema } from "./schemas/user.schema";
import { Invoice, InvoiceSchema } from "./schemas/invoice.schema";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: [".env", "../../.env"],
    }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/stockflow",
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
  ],
  controllers: [HealthController],
})
export class AppModule {}
