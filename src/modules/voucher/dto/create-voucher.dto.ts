import { Transform } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateVoucherDTO {
  @IsNotEmpty()
  @Transform((value) => Number(value))
  readonly eventId!: string;

  @IsNotEmpty()
  @IsString()
  readonly code!: string;

  @IsNotEmpty()
  @Transform((value) => Number(value))
  readonly discountAmount!: string;

  @IsNotEmpty()
  @IsString()
  readonly startDate!: string;

  @IsNotEmpty()
  @IsString()
  readonly endDate!: string;

  @IsNotEmpty()
  @Transform((value) => Number(value))
  readonly qty!: string;
}
