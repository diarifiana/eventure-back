import { Type } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateVoucherDTO {
  @IsNotEmpty()
  @IsString()
  readonly eventName!: string;

  @IsNotEmpty()
  @IsString()
  readonly code!: string;

  @IsNotEmpty()
  @Type(() => Number)
  readonly discountAmount!: number;

  @IsNotEmpty()
  @Type(() => Date)
  readonly startDate!: Date;

  @IsNotEmpty()
  @Type(() => Date)
  readonly endDate!: Date;
}
