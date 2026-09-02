import { Transform, Type } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

function trimStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

export class CreateProductDto {
  @Transform(({ value }) => trimStringValue(value))
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @Transform(({ value }) => trimStringValue(value))
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Transform(({ value }) => trimStringValue(value))
  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  unitPrice!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantityOnHand!: number;
}
