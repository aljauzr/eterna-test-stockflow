import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-request.interface";
import { CreateProductDto } from "./dto/create-product.dto";
import { ListProductsQueryDto } from "./dto/list-products-query.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { InventoryService } from "./inventory.service";

@UseGuards(AuthGuard)
@Controller("products")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.inventoryService.create(user.id, createProductDto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListProductsQueryDto,
  ) {
    return this.inventoryService.list(user.id, query);
  }

  @Get("suggested-sku")
  getSuggestedSku(@CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.getSuggestedSku(user.id);
  }

  @Get(":productId")
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param("productId") productId: string,
  ) {
    return this.inventoryService.getOne(user.id, productId);
  }

  @Patch(":productId")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("productId") productId: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.inventoryService.update(user.id, productId, updateProductDto);
  }

  @Delete(":productId")
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("productId") productId: string,
  ) {
    return this.inventoryService.remove(user.id, productId);
  }
}
