import { Transform } from "class-transformer";
import { IsEnum } from "class-validator";
import { INVOICE_STATUSES, InvoiceStatus } from "../../schemas/invoice.schema";

function trimStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

export class UpdateInvoiceStatusDto {
  @Transform(({ value }) => trimStringValue(value))
  @IsEnum(INVOICE_STATUSES)
  status!: InvoiceStatus;
}
