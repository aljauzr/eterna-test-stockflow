import { Transform, Type } from "class-transformer";
import { IsInt, IsMongoId, Min } from "class-validator";

function trimStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

export class InvoiceItemInputDto {
  @Transform(({ value }) => trimStringValue(value))
  @IsMongoId()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}
