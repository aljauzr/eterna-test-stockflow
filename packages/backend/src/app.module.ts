import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "./auth/auth.module";
import appConfig from "./config/app.config";
import { HealthController } from "./health/health.controller";
import { InventoryModule } from "./inventory/inventory.module";

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
    AuthModule,
    InventoryModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
