import {
  Body,
  Controller,
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
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { ListInvoicesQueryDto } from "./dto/list-invoices-query.dto";
import { UpdateInvoiceStatusDto } from "./dto/update-invoice-status.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import { InvoiceService } from "./invoice.service";

@UseGuards(AuthGuard)
@Controller("invoices")
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoiceService.create(user.id, createInvoiceDto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListInvoicesQueryDto) {
    return this.invoiceService.list(user.id, query);
  }

  @Get(":invoiceId")
  getOne(@CurrentUser() user: AuthenticatedUser, @Param("invoiceId") invoiceId: string) {
    return this.invoiceService.getOne(user.id, invoiceId);
  }

  @Patch(":invoiceId")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("invoiceId") invoiceId: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    return this.invoiceService.update(user.id, invoiceId, updateInvoiceDto);
  }

  @Patch(":invoiceId/status")
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("invoiceId") invoiceId: string,
    @Body() updateInvoiceStatusDto: UpdateInvoiceStatusDto,
  ) {
    return this.invoiceService.updateStatus(user.id, invoiceId, updateInvoiceStatusDto);
  }
}
