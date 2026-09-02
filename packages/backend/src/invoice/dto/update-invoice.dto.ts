import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { InvoiceItemInputDto } from "./invoice-item-input.dto";

function trimStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

export class UpdateInvoiceDto {
  @Transform(({ value }) => trimStringValue(value))
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @Transform(({ value }) => trimStringValue(value))
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemInputDto)
  items?: InvoiceItemInputDto[];
}
