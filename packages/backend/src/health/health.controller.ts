import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      success: true,
      message: "StockFlow backend is running",
      timestamp: new Date().toISOString(),
    };
  }
}
