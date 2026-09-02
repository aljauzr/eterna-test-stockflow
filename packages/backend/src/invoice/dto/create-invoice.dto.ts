import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { InvoiceItemInputDto } from "./invoice-item-input.dto";

function trimStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

export class CreateInvoiceDto {
  @Transform(({ value }) => trimStringValue(value))
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsDateString()
  issueDate!: string;

  @IsDateString()
  dueDate!: string;

  @Transform(({ value }) => trimStringValue(value))
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemInputDto)
  items!: InvoiceItemInputDto[];
}
