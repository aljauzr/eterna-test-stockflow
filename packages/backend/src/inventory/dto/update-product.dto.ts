import { Transform, Type } from "class-transformer";
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

function trimStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

export class UpdateProductDto {
  @Transform(({ value }) => trimStringValue(value))
  @IsOptional()
  @IsString()
  sku?: string;

  @Transform(({ value }) => trimStringValue(value))
  @IsOptional()
  @IsString()
  name?: string;

  @Transform(({ value }) => trimStringValue(value))
  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  unitPrice?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  quantityOnHand?: number;
}
