import { Transform, Type } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
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
  @MaxLength(150, { message: "Description must be at most 150 characters." })
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
