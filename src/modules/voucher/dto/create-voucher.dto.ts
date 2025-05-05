import { Transform, Type } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateVoucherDTO {
  @IsNotEmpty()
  @Transform((value) => Number(value))
  readonly eventId!: number;

  @IsNotEmpty()
  @IsString()
  readonly code!: string;

  @IsNotEmpty()
  @Transform((value) => Number(value))
  readonly discountAmount!: number;

  @IsNotEmpty()
  @Type(() => Date)
  readonly startDate!: Date;

  @IsNotEmpty()
  @Type(() => Date)
  readonly endDate!: Date;
}
